package dk.ulfen.werewolf;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.google.gson.Gson;

/**
 * The werewolf's stats, generated from src/werewolf.mjs into data/werewolf/werewolf.json
 * by tools/java.mjs (the same numbers as the Bedrock add-on). Field names match the JSON.
 */
public record WerewolfData(
	double health,
	int xp,
	float silverMultiplier,
	float beastArmor,
	Form wolf,
	Form beast,
	Sounds sounds,
	Spawn spawn
) {
	public record Form(float width, float height, double speed, double attack, double knockbackResistance, double followRange, List<String> animations) {}

	public record Sounds(String ambient, String hurt, String death, float pitchMin, float pitchMax, int interval) {}

	public record Spawn(List<String> biomes, int weight, int min, int max) {}

	private static WerewolfData data;

	public static WerewolfData get() {
		if (data == null) {
			try (InputStream in = WerewolfData.class.getResourceAsStream("/data/werewolf/werewolf.json")) {
				if (in == null) throw new IllegalStateException("werewolf.json missing from the mod jar (run `npm run build`)");
				data = new Gson().fromJson(new InputStreamReader(in, StandardCharsets.UTF_8), WerewolfData.class);
			} catch (IOException e) {
				throw new IllegalStateException("Could not read werewolf.json", e);
			}
		}
		return data;
	}

	public Form form(boolean isBeast) {
		return isBeast ? beast : wolf;
	}
}
