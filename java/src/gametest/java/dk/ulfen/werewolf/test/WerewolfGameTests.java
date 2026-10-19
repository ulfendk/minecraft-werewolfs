package dk.ulfen.werewolf.test;

import dk.ulfen.werewolf.WerewolfRegistry;
import dk.ulfen.werewolf.entity.Werewolf;
import net.fabricmc.fabric.api.gametest.v1.GameTest;
import net.minecraft.core.BlockPos;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.GameType;

/**
 * Server-side checks run by `./gradlew runGameTest` (and in CI). The test environments
 * werewolf:noon and werewolf:midnight (src/gametest/resources/data) set the time of day.
 */
public class WerewolfGameTests {
	private static final String NOON = "werewolf:noon";
	private static final String MIDNIGHT = "werewolf:midnight";

	private static Werewolf spawn(GameTestHelper helper, int x, int z) {
		return helper.spawn(WerewolfRegistry.WEREWOLF, new BlockPos(x, 1, z));
	}

	/** By day it is a wolf-sized wolf. */
	@GameTest(environment = NOON, maxTicks = 100)
	public void wolfByDay(GameTestHelper helper) {
		Werewolf w = spawn(helper, 2, 2);
		helper.runAfterDelay(20, () -> {
			if (w.isBeast()) helper.fail("Werewolf is a beast at noon");
			if (w.getBbHeight() > 1.0F) helper.fail("Wolf is " + w.getBbHeight() + " blocks tall");
			helper.succeed();
		});
	}

	/** By night it is a beast, about four blocks tall. */
	@GameTest(environment = MIDNIGHT, maxTicks = 100)
	public void beastByNight(GameTestHelper helper) {
		Werewolf w = spawn(helper, 2, 2);
		helper.runAfterDelay(20, () -> {
			if (!w.isBeast()) helper.fail("Werewolf is still a wolf at midnight");
			if (w.getBbHeight() < 3.5F) helper.fail("Beast is only " + w.getBbHeight() + " blocks tall");
			helper.succeed();
		});
	}

	/** A wolf caught out at night changes, and howls. */
	@GameTest(environment = MIDNIGHT, maxTicks = 100)
	public void changesAtNightfall(GameTestHelper helper) {
		Werewolf w = spawn(helper, 2, 2);
		w.setBeast(false, false);
		helper.succeedWhen(() -> {
			if (!w.isBeast()) helper.fail("Wolf did not change into a beast");
		});
	}

	/** A beast in daylight shrinks back into a wolf. */
	@GameTest(environment = NOON, maxTicks = 100)
	public void changesBackAtDaybreak(GameTestHelper helper) {
		Werewolf w = spawn(helper, 2, 2);
		w.setBeast(true, false);
		helper.succeedWhen(() -> {
			if (w.isBeast() || w.getBbHeight() > 1.0F) helper.fail("Beast did not change back into a wolf");
		});
	}

	// Mock players are not in the level's player list, so target selection is tested with villagers.

	/** At night it hunts villagers (and players, through the same kind of goal). */
	@GameTest(environment = MIDNIGHT, maxTicks = 200)
	public void beastHuntsVillagers(GameTestHelper helper) {
		Werewolf w = spawn(helper, 1, 1);
		Mob villager = helper.spawn(EntityTypes.VILLAGER, new BlockPos(5, 1, 5));
		helper.succeedWhen(() -> {
			if (w.getTarget() != villager) helper.fail("Beast has not targeted the villager");
		});
	}

	/** By day it leaves villagers alone... */
	@GameTest(environment = NOON, maxTicks = 100)
	public void wolfIgnoresVillagers(GameTestHelper helper) {
		Werewolf w = spawn(helper, 1, 1);
		Mob villager = helper.spawn(EntityTypes.VILLAGER, new BlockPos(4, 1, 4));
		villager.setNoAi(true);
		helper.runAfterDelay(60, () -> {
			if (w.getTarget() == villager) helper.fail("Wolf went for a villager in daylight");
			helper.succeed();
		});
	}

	/** ...and hunts sheep like a wild wolf. */
	@GameTest(environment = NOON, maxTicks = 300)
	public void wolfHuntsSheep(GameTestHelper helper) {
		Werewolf w = spawn(helper, 1, 1);
		Mob sheep = helper.spawn(EntityTypes.SHEEP, new BlockPos(5, 1, 5));
		helper.succeedWhen(() -> {
			if (w.getTarget() != sheep) helper.fail("Wolf has not targeted the sheep");
		});
	}

	/** Silver deals triple damage to the beast; iron only half. */
	@GameTest(environment = MIDNIGHT, maxTicks = 100)
	public void silverHurtsTheBeast(GameTestHelper helper) {
		Werewolf a = spawn(helper, 1, 1);
		Werewolf b = spawn(helper, 4, 4);
		a.setNoAi(true);
		b.setNoAi(true);
		helper.runAfterDelay(5, () -> {
			Player silver = helper.makeMockPlayer(GameType.SURVIVAL);
			silver.setItemInHand(InteractionHand.MAIN_HAND, new ItemStack(WerewolfRegistry.SILVER_SWORD));
			Player iron = helper.makeMockPlayer(GameType.SURVIVAL);
			iron.setItemInHand(InteractionHand.MAIN_HAND, new ItemStack(Items.IRON_SWORD));
			float start = a.getHealth();
			a.hurtServer(helper.getLevel(), helper.getLevel().damageSources().playerAttack(silver), 4.0F);
			b.hurtServer(helper.getLevel(), helper.getLevel().damageSources().playerAttack(iron), 4.0F);
			float silverLoss = start - a.getHealth(), ironLoss = start - b.getHealth();
			if (Math.abs(silverLoss - 12.0F) > 0.01F) helper.fail("Silver did " + silverLoss + " damage, expected 12");
			if (Math.abs(ironLoss - 2.0F) > 0.01F) helper.fail("Iron did " + ironLoss + " damage, expected 2");
			helper.succeed();
		});
	}
}
