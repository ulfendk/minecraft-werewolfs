package dk.ulfen.werewolf.test;

import net.fabricmc.fabric.api.client.gametest.v1.FabricClientGameTest;
import net.fabricmc.fabric.api.client.gametest.v1.context.ClientGameTestContext;
import net.fabricmc.fabric.api.client.gametest.v1.context.TestSingleplayerContext;

/**
 * Starts a real client and screenshots werewolves by day and by night
 * (run with `./gradlew runClientGameTest`; images land in build/run/clientGameTest/screenshots).
 */
public class WerewolfClientGameTest implements FabricClientGameTest {
	@Override
	public void runTest(ClientGameTestContext context) {
		try (TestSingleplayerContext world = context.worldBuilder().create()) {
			world.getServer().runCommand("gamerule doDaylightCycle false");
			world.getServer().runCommand("gamerule doMobSpawning false");
			world.getServer().runCommand("weather clear");
			world.getServer().runCommand("time set noon");
			context.waitTicks(20);
			for (int x : new int[] {-3, 0, 3}) {
				world.getServer().runCommand("summon werewolf:werewolf " + x + " -60 0 {NoAI:1b,Rotation:[150f,0f]}");
			}
			world.getServer().runCommand("tp @p 0 -58 -8 0 12");
			context.waitTicks(40);
			context.takeScreenshot("werewolf_day");

			// NoAI mobs don't tick their AI, so let them change by themselves first.
			world.getServer().runCommand("kill @e[type=werewolf:werewolf]");
			world.getServer().runCommand("time set midnight");
			context.waitTicks(20);
			for (int x : new int[] {-4, 0, 4}) {
				world.getServer().runCommand("summon werewolf:werewolf " + x + " -60 0 {NoAI:1b,Rotation:[150f,0f]}");
			}
			world.getServer().runCommand("tp @p 0 -57 -12 0 0");
			context.waitTicks(40);
			context.takeScreenshot("werewolf_night");
		}
	}
}
