package dk.ulfen.werewolf;

import java.util.function.Function;
import java.util.function.Predicate;

import dk.ulfen.werewolf.entity.Werewolf;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectionContext;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.fabricmc.fabric.api.creativetab.v1.FabricCreativeModeTab;
import net.fabricmc.fabric.api.object.builder.v1.entity.FabricDefaultAttributeRegistry;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.BiomeTags;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.entity.SpawnPlacementTypes;
import net.minecraft.world.entity.SpawnPlacements;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SpawnEggItem;
import net.minecraft.world.item.ToolMaterial;
import net.minecraft.world.level.levelgen.Heightmap;

/** Everything the mod adds to the game registries. */
public final class WerewolfRegistry {
	public static EntityType<Werewolf> WEREWOLF;
	public static Item WEREWOLF_SPAWN_EGG;
	public static Item SILVER_INGOT;
	public static Item SILVER_SWORD;

	private WerewolfRegistry() {}

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(Werewolves.MOD_ID, path);
	}

	static void register() {
		WerewolfData data = WerewolfData.get();

		// Registered with the wolf's size; Werewolf#getDefaultDimensions grows it at night.
		ResourceKey<EntityType<?>> key = ResourceKey.create(Registries.ENTITY_TYPE, id("werewolf"));
		WEREWOLF = Registry.register(BuiltInRegistries.ENTITY_TYPE, key,
			EntityType.Builder.<Werewolf>of(Werewolf::new, MobCategory.CREATURE).sized(data.wolf().width(), data.wolf().height()).clientTrackingRange(10).build(key));
		FabricDefaultAttributeRegistry.register(WEREWOLF, Werewolf.createAttributes());
		SpawnPlacements.register(WEREWOLF, SpawnPlacementTypes.ON_GROUND, Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, Werewolf::checkSpawn);

		Predicate<BiomeSelectionContext> biomes = data.spawn().biomes().stream().map(WerewolfRegistry::biomes).reduce(Predicate::or).orElse(c -> false);
		BiomeModifications.addSpawn(biomes, MobCategory.CREATURE, WEREWOLF, data.spawn().weight(), data.spawn().min(), data.spawn().max());

		WEREWOLF_SPAWN_EGG = item("werewolf_spawn_egg", SpawnEggItem::new, new Item.Properties().spawnEgg(WEREWOLF));
		SILVER_INGOT = item("silver_ingot", Item::new, new Item.Properties());
		// Same damage and speed as an iron sword; the bonus against werewolves is in Werewolf#hurtServer.
		SILVER_SWORD = item("silver_sword", Item::new, new Item.Properties().sword(ToolMaterial.IRON, 3.0F, -2.4F).durability(300).repairable(SILVER_INGOT));

		CreativeModeTab tab = FabricCreativeModeTab.builder()
			.title(Component.translatable("itemGroup.werewolf"))
			.icon(() -> new ItemStack(WEREWOLF_SPAWN_EGG))
			.displayItems((params, out) -> {
				out.accept(WEREWOLF_SPAWN_EGG);
				out.accept(SILVER_INGOT);
				out.accept(SILVER_SWORD);
			})
			.build();
		Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, id("werewolf"), tab);
	}

	private static <T extends Item> T item(String name, Function<Item.Properties, T> factory, Item.Properties props) {
		ResourceKey<Item> key = ResourceKey.create(Registries.ITEM, id(name));
		return Registry.register(BuiltInRegistries.ITEM, key, factory.apply(props.setId(key)));
	}

	/** Biome names used in the shared spec -> biome selectors. */
	private static Predicate<BiomeSelectionContext> biomes(String name) {
		return switch (name) {
			case "forest" -> BiomeSelectors.tag(BiomeTags.IS_FOREST);
			case "taiga" -> BiomeSelectors.tag(BiomeTags.IS_TAIGA);
			default -> throw new IllegalArgumentException("Unknown biome group " + name);
		};
	}
}
