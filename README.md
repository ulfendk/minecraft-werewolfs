# Werewolves

A Minecraft **Bedrock Edition** add-on and **Java Edition** (Fabric) mod. By day it is an ordinary grey wolf in the forest. When the sun goes down it howls, rises on two legs, four blocks tall, and goes hunting. Only silver can stop it.

**Download and info: https://ulfendk.github.io/minecraft-werewolfs/** (på dansk: https://ulfendk.github.io/minecraft-werewolfs/da/)

![The wolf by day and the werewolf by night](https://ulfendk.github.io/minecraft-werewolfs/img/forms/beast.png)

## Features
- **By day, a wolf.** It roams forests and taigas, hunts sheep and rabbits, and leaves you alone unless you hit it.
- **By night, a werewolf.** At dusk it howls and changes into a 4 block tall beast with its own model and animations. It hunts players and villagers, takes half damage from ordinary weapons and no fall damage, and iron golems fight it (Bedrock). At dawn it shrinks back into a wolf.
- **Silver.** Craft a silver ingot from an iron ingot and an amethyst shard. Two ingots and a stick make a silver sword, which deals triple damage to a werewolf in beast form.
- English and Danish texts.

## Install
1. Download `Werewolves.mcaddon` from the [latest release](https://github.com/ulfendk/minecraft-werewolfs/releases/latest).
2. Open it on Windows, Android or iOS. Minecraft imports both packs.
3. In your world settings, turn on **Werewolves** under *Behavior Packs*.

Requires Minecraft Bedrock 1.21.90 or newer.

### Java Edition
1. Install [Fabric Loader](https://fabricmc.net/use/installer/) for Minecraft 26.3.
2. Download `werewolves-fabric-<version>.jar` from the [latest release](https://github.com/ulfendk/minecraft-werewolfs/releases/latest), plus [Fabric API](https://modrinth.com/mod/fabric-api) and [GeckoLib](https://modrinth.com/mod/geckolib).
3. Put all three in your `mods` folder.

## Development
Everything is generated from code, the same way as [Safari Animals](https://github.com/ulfendk/minecraft-safari-animals): models, textures and animations come from the spec in `src/werewolf.mjs`.

```sh
npm ci
npm run build      # writes build/behavior_pack, build/resource_pack and the Java resources
npm run validate   # static checks, mostly for the resource pack
npm run preview    # renders both forms to build/preview/*.png
npm run package    # dist/*.mcaddon and *.mcpack
npm run site       # the website, in build/site/
npm run test:server  # loads the packs in a Bedrock Dedicated Server and checks the day/night change (needs Docker)

cd java                       # Java edition (needs JDK 25; run `npm run build` first)
./gradlew build               # the Fabric mod jar in java/build/libs (also runs the game tests)
./gradlew runGameTest         # server-side game tests
./gradlew runClientGameTest   # starts a client and screenshots the werewolf by day and by night
./gradlew runClient           # play it
```

One entity has two forms. On Bedrock the forms are component groups swapped by an `environment_sensor` (`is_daytime`), and the synced `werewolf:beast` property picks the geometry, texture and animation controllers in the render controller and client entity. On Java the `Werewolf` entity keeps a synced flag that sets its hitbox, stats and GeckoLib model. `tools/java.mjs` writes the shared models, animations, textures, lang files and stats (`data/werewolf/werewolf.json`) to `java/src/generated/resources`.

| Path | What it is |
| --- | --- |
| `src/werewolf.mjs` | The werewolf: stats, and for each form the model, texture recipe and animations |
| `src/items.mjs` | Silver ingot and silver sword, with recipes |
| `src/i18n.mjs` | English and Danish texts for the game and the website |
| `src/lib/` | Generators: model + UV packing, procedural textures, animations, entity JSON |
| `src/packs/` | Hand-written pack files, including the Script API code in `behavior_pack/scripts/` |
| `tools/` | Build, validation, preview renderer, packaging, website, server test, Java resources |
| `java/` | The Fabric mod (Java edition) |

### Releases
Bump `version` in `package.json`, add a section to `CHANGELOG.md`, then push a tag such as `v0.1.0`. The release workflow builds and tests both editions, publishes a GitHub Release with the files, and updates the website.

## License
MIT. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
