package dk.ulfen.werewolf.client;

import dk.ulfen.werewolf.WerewolfRegistry;
import net.fabricmc.api.ClientModInitializer;
import net.minecraft.client.renderer.entity.EntityRenderers;

public class WerewolvesClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		EntityRenderers.register(WerewolfRegistry.WEREWOLF, WerewolfRenderer::new);
	}
}
