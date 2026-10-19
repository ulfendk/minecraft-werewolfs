package dk.ulfen.werewolf.entity;

import com.geckolib.animatable.GeoEntity;
import com.geckolib.animatable.instance.AnimatableInstanceCache;
import com.geckolib.animatable.manager.AnimatableManager;
import com.geckolib.animation.AnimationController;
import com.geckolib.animation.RawAnimation;
import com.geckolib.animation.object.PlayState;
import com.geckolib.constant.DataTickets;
import com.geckolib.util.GeckoLibUtil;

import dk.ulfen.werewolf.WerewolfData;
import dk.ulfen.werewolf.WerewolfRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.Identifier;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundSource;
import net.minecraft.util.RandomSource;
import net.minecraft.world.Difficulty;
import net.minecraft.world.DifficultyInstance;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityDimensions;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.PathfinderMob;
import net.minecraft.world.entity.Pose;
import net.minecraft.world.entity.SpawnGroupData;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.npc.villager.AbstractVillager;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.ServerLevelAccessor;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;
import org.jspecify.annotations.Nullable;

/**
 * An ordinary-looking wolf by day that turns into a four block tall werewolf at night.
 * The form is a synced flag: it picks the hitbox, the stats, the model and the animations.
 */
public class Werewolf extends PathfinderMob implements GeoEntity {
	private static final EntityDataAccessor<Boolean> BEAST = SynchedEntityData.defineId(Werewolf.class, EntityDataSerializers.BOOLEAN);
	/** How long it stands still and howls after changing (ticks). */
	public static final int HOWL_TICKS = 60;

	private final AnimatableInstanceCache geoCache = GeckoLibUtil.createInstanceCache(this);
	private int howlTicks;

	public Werewolf(EntityType<? extends Werewolf> type, Level level) {
		super(type, level);
	}

	public static AttributeSupplier.Builder createAttributes() {
		WerewolfData d = WerewolfData.get();
		return Mob.createMobAttributes()
			.add(Attributes.MAX_HEALTH, d.health())
			.add(Attributes.MOVEMENT_SPEED, d.wolf().speed())
			.add(Attributes.ATTACK_DAMAGE, d.wolf().attack())
			.add(Attributes.FOLLOW_RANGE, d.wolf().followRange())
			.add(Attributes.KNOCKBACK_RESISTANCE, d.wolf().knockbackResistance());
	}

	@Override
	protected void defineSynchedData(SynchedEntityData.Builder builder) {
		super.defineSynchedData(builder);
		builder.define(BEAST, false);
	}

	@Override
	protected void registerGoals() {
		this.goalSelector.addGoal(0, new FloatGoal(this));
		this.goalSelector.addGoal(3, new MeleeAttackGoal(this, 1.3, true));
		this.goalSelector.addGoal(8, new WaterAvoidingRandomStrollGoal(this, 0.9));
		this.goalSelector.addGoal(9, new LookAtPlayerGoal(this, Player.class, 8.0F));
		this.goalSelector.addGoal(10, new RandomLookAroundGoal(this));

		this.targetSelector.addGoal(1, new HurtByTargetGoal(this).setAlertOthers());
		// The beast hunts people; the wolf hunts sheep and rabbits like a wild wolf.
		this.targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, 10, false, false,
			(target, level) -> isBeast() && level.getDifficulty() != Difficulty.PEACEFUL));
		this.targetSelector.addGoal(3, new NearestAttackableTargetGoal<>(this, AbstractVillager.class, 10, false, false,
			(target, level) -> isBeast()));
		this.targetSelector.addGoal(5, new NearestAttackableTargetGoal<>(this, LivingEntity.class, 20, true, false,
			(target, level) -> !isBeast() && isWolfPrey(target) && target.distanceTo(this) < 12));
	}

	private static boolean isWolfPrey(LivingEntity e) {
		return e.getType() == EntityTypes.SHEEP || e.getType() == EntityTypes.RABBIT;
	}

	// ---------------------------------------------------------------- form

	public boolean isBeast() {
		return this.entityData.get(BEAST);
	}

	public WerewolfData.Form form() {
		return WerewolfData.get().form(isBeast());
	}

	/** Change form now. With a howl (and smoke) unless it was just spawned. */
	public void setBeast(boolean beast, boolean howl) {
		if (beast == isBeast() && this.tickCount > 0) return;
		this.entityData.set(BEAST, beast);
		WerewolfData.Form f = form();
		this.getAttribute(Attributes.MOVEMENT_SPEED).setBaseValue(f.speed());
		this.getAttribute(Attributes.ATTACK_DAMAGE).setBaseValue(f.attack());
		this.getAttribute(Attributes.FOLLOW_RANGE).setBaseValue(f.followRange());
		this.getAttribute(Attributes.KNOCKBACK_RESISTANCE).setBaseValue(f.knockbackResistance());
		this.getAttribute(Attributes.STEP_HEIGHT).setBaseValue(beast ? 1.0 : 0.6);
		this.refreshDimensions();
		// The wolf forgets the people it was hunting (unless they hurt it).
		if (!beast && getTarget() instanceof Player && getLastHurtByMob() != getTarget()) setTarget(null);
		if (howl && this.level() instanceof ServerLevel level) transformEffects(level, beast);
	}

	private void transformEffects(ServerLevel level, boolean beast) {
		for (double y = 0; y < (beast ? 4 : 1.5); y += 0.75) {
			level.sendParticles(ParticleTypes.EXPLOSION, getX(), getY() + y, getZ(), 1, 0.3, 0.2, 0.3, 0.0);
		}
		if (beast) {
			this.howlTicks = HOWL_TICKS;
			level.playSound(null, this, sound("minecraft:entity.wolf.whine"), SoundSource.HOSTILE, 4.0F, 0.5F);
			level.playSound(null, this, sound("minecraft:entity.wolf.growl"), SoundSource.HOSTILE, 2.0F, 0.6F);
			for (ServerPlayer player : level.players()) {
				if (player.distanceTo(this) < 48) player.sendOverlayMessage(Component.translatable("werewolf.howl"));
			}
		} else {
			level.playSound(null, this, sound("minecraft:entity.wolf.whine"), SoundSource.NEUTRAL, 1.0F, 1.2F);
		}
	}

	/** Night: dark outside in a world with a day/night cycle. */
	private boolean isNight() {
		return this.level().dimensionType().hasSkyLight() && this.level().isDarkOutside();
	}

	@Override
	public void aiStep() {
		super.aiStep();
		if (this.level() instanceof ServerLevel) {
			if (isNight() != isBeast()) setBeast(isNight(), true);
			if (this.howlTicks > 0) {
				this.getNavigation().stop();
				// Wait until clients have the beast model before the howl animation plays.
				if (this.howlTicks == HOWL_TICKS - 3) triggerAnim("action", "howl");
				this.howlTicks--;
			}
		}
	}

	@Override
	protected EntityDimensions getDefaultDimensions(Pose pose) {
		WerewolfData.Form f = form();
		return EntityDimensions.scalable(f.width(), f.height());
	}

	@Override
	public void onSyncedDataUpdated(EntityDataAccessor<?> key) {
		super.onSyncedDataUpdated(key);
		if (BEAST.equals(key)) this.refreshDimensions();
	}

	@Override
	public @Nullable SpawnGroupData finalizeSpawn(ServerLevelAccessor level, DifficultyInstance difficulty, EntitySpawnReason reason, @Nullable SpawnGroupData groupData) {
		setBeast(isNight(), false);
		return super.finalizeSpawn(level, difficulty, reason, groupData);
	}

	// ---------------------------------------------------------------- combat

	public static boolean isSilver(@Nullable ItemStack stack) {
		return stack != null && stack.is(WerewolfRegistry.SILVER_SWORD);
	}

	/** In beast form silver cuts deep and everything else barely scratches it. */
	@Override
	public boolean hurtServer(ServerLevel level, DamageSource source, float damage) {
		if (isBeast()) {
			boolean silver = source.isDirect() && isSilver(source.getWeaponItem());
			damage *= silver ? WerewolfData.get().silverMultiplier() : WerewolfData.get().beastArmor();
		}
		return super.hurtServer(level, source, damage);
	}

	@Override
	public boolean causeFallDamage(double fallDistance, float damageModifier, DamageSource source) {
		return !isBeast() && super.causeFallDamage(fallDistance, damageModifier, source);
	}

	@Override
	public boolean doHurtTarget(ServerLevel level, Entity target) {
		triggerAnim("action", "attack");
		return super.doHurtTarget(level, target);
	}

	@Override
	protected int getBaseExperienceReward(ServerLevel level) {
		return WerewolfData.get().xp();
	}

	@Override
	public boolean removeWhenFarAway(double distance) {
		return false;
	}

	// ---------------------------------------------------------------- sounds

	private static SoundEvent sound(String id) {
		return BuiltInRegistries.SOUND_EVENT.getValue(Identifier.parse(id));
	}

	@Override
	protected @Nullable SoundEvent getAmbientSound() {
		return sound(WerewolfData.get().sounds().ambient());
	}

	@Override
	protected SoundEvent getHurtSound(DamageSource source) {
		return sound(WerewolfData.get().sounds().hurt());
	}

	@Override
	protected SoundEvent getDeathSound() {
		return sound(WerewolfData.get().sounds().death());
	}

	@Override
	public int getAmbientSoundInterval() {
		return WerewolfData.get().sounds().interval() * 20;
	}

	@Override
	public float getVoicePitch() {
		WerewolfData.Sounds s = WerewolfData.get().sounds();
		float pitch = s.pitchMin() + this.random.nextFloat() * (s.pitchMax() - s.pitchMin());
		return isBeast() ? pitch * 0.8F : pitch;
	}

	// ---------------------------------------------------------------- saving

	@Override
	protected void addAdditionalSaveData(ValueOutput output) {
		super.addAdditionalSaveData(output);
		output.putBoolean("Beast", isBeast());
	}

	@Override
	protected void readAdditionalSaveData(ValueInput input) {
		super.readAdditionalSaveData(input);
		this.entityData.set(BEAST, input.getBooleanOr("Beast", false));
		this.refreshDimensions();
	}

	// ---------------------------------------------------------------- GeckoLib

	/** Animation id in the current form's animation file, e.g. animation.werewolf.beast.walk. */
	public String animation(String name) {
		return "animation.werewolf." + (isBeast() ? "beast" : "wolf") + "." + name;
	}

	@Override
	public void registerControllers(AnimatableManager.ControllerRegistrar controllers) {
		controllers.add(new AnimationController<Werewolf>("move", 4, state -> {
			Werewolf w = state.animatable();
			var v = state.getDataOrDefault(DataTickets.VELOCITY, net.minecraft.world.phys.Vec3.ZERO);
			double speed = Math.sqrt(v.x * v.x + v.z * v.z) * 20;
			String anim = speed > (w.isBeast() ? 4 : 5) ? "run" : speed > 0.4 ? "walk" : "idle";
			return state.setAndContinue(RawAnimation.begin().thenLoop(w.animation(anim)));
		}));
		AnimationController<Werewolf> action = new AnimationController<>("action", 2, state -> PlayState.STOP);
		action.triggerableAnim("attack", RawAnimation.begin().thenPlay("animation.werewolf.wolf.attack"));
		action.triggerableAnim("beast_attack", RawAnimation.begin().thenPlay("animation.werewolf.beast.attack"));
		action.triggerableAnim("howl", RawAnimation.begin().thenPlay("animation.werewolf.beast.howl"));
		controllers.add(action);
	}

	@Override
	public void triggerAnim(@Nullable String controllerName, String animName) {
		// Each form has its own attack animation.
		GeoEntity.super.triggerAnim(controllerName, "attack".equals(animName) && isBeast() ? "beast_attack" : animName);
	}

	@Override
	public AnimatableInstanceCache getAnimatableInstanceCache() {
		return this.geoCache;
	}

	/** Spawn rule: on solid ground, at any time of day. */
	public static boolean checkSpawn(EntityType<? extends Mob> type, ServerLevelAccessor level, EntitySpawnReason reason, BlockPos pos, RandomSource random) {
		BlockPos below = pos.below();
		return level.getBlockState(below).isFaceSturdy(level, below, Direction.UP);
	}
}
