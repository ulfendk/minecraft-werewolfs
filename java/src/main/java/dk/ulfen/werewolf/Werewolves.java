package dk.ulfen.werewolf;

import net.fabricmc.api.ModInitializer;

public class Werewolves implements ModInitializer {
	public static final String MOD_ID = "werewolf";

	@Override
	public void onInitialize() {
		WerewolfData.get();
		WerewolfRegistry.register();
	}
}
