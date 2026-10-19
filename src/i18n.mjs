// In-game texts (both editions) and website texts, in English and Danish.
import { NS } from './lib/constants.mjs';

export const LOCALES = ['en_US', 'da_DK'];

const GAME = {
  en_US: {
    description: 'Ordinary wolves by day. Four block tall werewolves by night.',
    entity: 'Werewolf',
    egg: 'Werewolf Spawn Egg',
    items: { silver_ingot: 'Silver Ingot', silver_sword: 'Silver Sword' },
    itemGroup: 'Werewolves',
    howl: 'A howl echoes through the night...',
  },
  da_DK: {
    description: 'Almindelige ulve om dagen. Fire blokke høje varulve om natten.',
    entity: 'Varulv',
    egg: 'Varulv-spawnæg',
    items: { silver_ingot: 'Sølvbarre', silver_sword: 'Sølvsværd' },
    itemGroup: 'Varulve',
    howl: 'Et hyl giver genlyd gennem natten...',
  },
};

/** Bedrock .lang entries as [key, value] pairs (tools/java.mjs converts them for Java). */
export function langEntries(locale, { werewolf, items, version }) {
  const g = GAME[locale];
  return [
    ['pack.description', `${g.description} v${version}`],
    [`entity.${NS}:${werewolf.id}.name`, g.entity],
    [`item.spawn_egg.entity.${NS}:${werewolf.id}.name`, g.egg],
    ...items.map((i) => [`item.${NS}:${i.id}.name`, g.items[i.id]]),
    [`${NS}.howl`, g.howl],
    [`itemGroup.${NS}`, g.itemGroup],
  ];
}

// ---------------------------------------------------------------- website

export const LANGUAGES = {
  en: { label: 'English', dir: '', htmlLang: 'en', dateLocale: 'en-GB' },
  da: { label: 'Dansk', dir: 'da', htmlLang: 'da', dateLocale: 'da-DK' },
};

const en = {
  title: 'Werewolves – Minecraft add-on and mod',
  description: 'Werewolves for Minecraft Bedrock and Java Edition: ordinary wolves by day, four block tall werewolves by night. Free download.',
  tagline: 'By day it is just a grey wolf in the forest. When the sun goes down it rises on two legs, four blocks tall, and goes hunting. Only silver can stop it.',
  download: 'iPad, phone, console & Windows: Bedrock',
  downloadJava: 'Mac & PC: Java Edition',
  which: '<b>Which one do I need?</b> Playing on an <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch or Minecraft for Windows? That is <b>Bedrock Edition</b> – take the first download. Playing on a computer with the Minecraft <b>Java Edition</b> launcher (Mac, Windows or Linux)? Take the Java download. Not sure? If you bought Minecraft in the App Store or Google Play, it is Bedrock.',
  bedrockTitle: 'Install on iPad, phone, console or Windows (Bedrock)',
  javaTitle: 'Install on Mac or PC (Java Edition)',
  steps: (link) => [
    `<strong>Download</strong> ${link} on your Windows PC, Android phone or tablet, or iPhone or iPad.`,
    '<strong>Open the file.</strong> Minecraft starts and imports both packs.',
    '<strong>Create or edit a world.</strong> Under <em>Behavior Packs</em>, turn on <em>Werewolves</em>. The resource pack is added automatically.',
    '<strong>Explore</strong> a forest or taiga, or use the spawn egg from the creative inventory – and wait for nightfall.',
  ],
  javaSteps: (jar, fabric, api, gecko) => [
    `<strong>Install</strong> ${fabric} for Minecraft 26.3.`,
    `<strong>Download</strong> ${jar}, plus ${api} and ${gecko}.`,
    '<strong>Put all three files</strong> in your <em>mods</em> folder and start Minecraft with the Fabric profile.',
    '<strong>Explore</strong> a forest or taiga, or find the spawn egg and silver in the <em>Werewolves</em> creative tab.',
  ],
  serverNote: (bp, rp) => `Running a server? Use the separate ${bp('behavior pack')} and ${rp('resource pack')}. Xbox, PlayStation and Switch can’t import add-ons from files, but you can join a world or Realm that has the add-on.`,
  allVersions: 'All versions',
  latestVersion: 'Latest version',
  released: 'released',
  install: 'Install',
  formsTitle: 'Two forms',
  forms: {
    wolf: ['By day: a wolf', 'A grey wolf roaming forests and taigas. It hunts sheep and rabbits and leaves you alone – unless you hit it.'],
    beast: ['By night: a werewolf', 'At dusk it howls and rises on two legs, four blocks tall. It hunts players and villagers, shrugs off half the damage from ordinary weapons, and is immune to falls. Iron golems fight it.'],
  },
  featuresTitle: 'How to survive the night',
  features: [
    ['Silver', 'Craft a silver ingot from an iron ingot and an amethyst shard. Two ingots and a stick make a silver sword.'],
    ['The silver sword', 'Deals triple damage to a werewolf in its beast form – the only weapon that really hurts it.'],
    ['Daybreak', 'At sunrise the beast shrinks back into an ordinary wolf. Hide until morning, and it is easy prey.'],
    ['Peaceful', 'On Peaceful difficulty werewolves never hunt players.'],
  ],
  itemsTitle: 'New items',
  footerSource: (src, issues) => `Werewolves is free and open source. ${src('Source code on GitHub')} · ${issues('Report a problem')}`,
  footerLegal: 'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
  items: { silver_ingot: 'Silver Ingot', silver_sword: 'Silver Sword' },
};

const da = {
  title: 'Varulve – tilføjelse og mod til Minecraft',
  description: 'Varulve til Minecraft Bedrock og Java Edition: almindelige ulve om dagen, fire blokke høje varulve om natten. Gratis download.',
  tagline: 'Om dagen er det bare en grå ulv i skoven. Når solen går ned, rejser den sig på to ben, fire blokke høj, og går på jagt. Kun sølv kan stoppe den.',
  download: 'iPad, telefon, konsol & Windows: Bedrock',
  downloadJava: 'Mac & pc: Java Edition',
  which: '<b>Hvilken skal jeg bruge?</b> Spiller du på <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch eller Minecraft til Windows? Så er det <b>Bedrock Edition</b> – tag den første download. Spiller du på en computer med Minecraft <b>Java Edition</b>-launcheren (Mac, Windows eller Linux)? Så tag Java-downloaden. I tvivl? Hvis Minecraft er købt i App Store eller Google Play, er det Bedrock.',
  bedrockTitle: 'Installér på iPad, telefon, konsol eller Windows (Bedrock)',
  javaTitle: 'Installér på Mac eller pc (Java Edition)',
  steps: (link) => [
    `<strong>Download</strong> ${link} på din Windows-pc, Android-telefon eller -tablet, iPhone eller iPad.`,
    '<strong>Åbn filen.</strong> Minecraft starter og importerer begge pakker.',
    '<strong>Opret eller redigér en verden.</strong> Slå <em>Werewolves</em> til under <em>Adfærdspakker</em>. Ressourcepakken kommer automatisk med.',
    '<strong>Udforsk</strong> en skov eller taiga, eller brug spawnægget fra den kreative oversigt – og vent på at det bliver nat.',
  ],
  javaSteps: (jar, fabric, api, gecko) => [
    `<strong>Installér</strong> ${fabric} til Minecraft 26.3.`,
    `<strong>Download</strong> ${jar} samt ${api} og ${gecko}.`,
    '<strong>Læg alle tre filer</strong> i din <em>mods</em>-mappe, og start Minecraft med Fabric-profilen.',
    '<strong>Udforsk</strong> en skov eller taiga, eller find spawnægget og sølvet under fanen <em>Varulve</em> i kreativ tilstand.',
  ],
  serverNote: (bp, rp) => `Kører du en server? Brug den separate ${bp('adfærdspakke')} og ${rp('ressourcepakke')}. Xbox, PlayStation og Switch kan ikke importere tilføjelser fra filer, men du kan deltage i en verden eller Realm, der har tilføjelsen.`,
  allVersions: 'Alle versioner',
  latestVersion: 'Nyeste version',
  released: 'udgivet',
  install: 'Installér',
  formsTitle: 'To skikkelser',
  forms: {
    wolf: ['Om dagen: en ulv', 'En grå ulv, der strejfer rundt i skove og taiga. Den jager får og kaniner og lader dig være i fred – medmindre du slår den.'],
    beast: ['Om natten: en varulv', 'Ved skumring hyler den og rejser sig på to ben, fire blokke høj. Den jager spillere og landsbyboere, tager kun halv skade fra almindelige våben og tager ingen faldskade. Jerngolemmer kæmper mod den.'],
  },
  featuresTitle: 'Sådan overlever du natten',
  features: [
    ['Sølv', 'Lav en sølvbarre af en jernbarre og et ametystskår. To sølvbarrer og en pind bliver til et sølvsværd.'],
    ['Sølvsværdet', 'Giver tredobbelt skade på en varulv i dens bæstskikkelse – det eneste våben, der for alvor gør ondt.'],
    ['Daggry', 'Ved solopgang skrumper bæstet tilbage til en almindelig ulv. Gem dig til morgenen, så er den let at nedlægge.'],
    ['Fredelig', 'På sværhedsgraden Fredelig jager varulve aldrig spillere.'],
  ],
  itemsTitle: 'Nye ting',
  footerSource: (src, issues) => `Varulve er gratis og open source. ${src('Kildekode på GitHub')} · ${issues('Meld et problem')}`,
  footerLegal: 'Ikke et officielt Minecraft-produkt. Ikke godkendt af eller tilknyttet Mojang eller Microsoft.',
  items: { silver_ingot: 'Sølvbarre', silver_sword: 'Sølvsværd' },
};

export const STRINGS = { en, da };
