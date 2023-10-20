import type { XmlNode } from "@s4tk/xml-dom";

export const UNSCANNABLE_TYPES = new Set([
  0x02D5DF13, // ASM
  0x7FB6AD8A, // S4SMergedPackageManifest
]);

export const BIT_RESTRICTIONS: {
  maxBits: number;
  maxValue: bigint;
  classNames: Set<string>;
  rootTests: {
    pluralName: string;
    fn: (root: XmlNode) => boolean;
  }[];
}[] = [
    {
      maxBits: 31,
      maxValue: 2147483647n,
      classNames: new Set([
        'DevelopmentalMilestone',
      ]),
      rootTests: []
    },
    {
      maxBits: 32,
      maxValue: 4294967295n,
      classNames: new Set([
        'Preference',
        'Reward',
        'HouseholdReward',
        'SimReward',
        'RelationshipBit',
        'SocialContextBit',
        'Aspiration',
        'AspirationAssignment',
        'AspirationBasic',
        'AspirationCareer',
        'AspirationGig',
        'AspirationFamilialTrigger',
        'AspirationNotification',
        'AspirationOrganizationTask',
        'AspirationSimInfoPanel',
        'AspirationWhimSet',
        'ObjectivelessWhimSet',
        'TimedAspiration',
        'ZoneDirectorEventListener',
      ]),
      rootTests: [
        {
          pluralName: "Personality traits",
          fn(root) {
            if (root.attributes.c !== "Trait") return false;
            return root.findChild("trait_type").innerValue === "PERSONALITY";
          }
        }
      ]
    }
  ];

export const REQUIRED_SIMDATAS = {
  alwaysTypes: new Set([
    "achievement",
    "achievement_category",
    "achievement_collection",
    "aspiration_category",
    "aspiration_track",
    "breed",
    "buff",
    "business",
    "career",
    "career_level",
    "career_track",
    "cas_menu",
    "cas_menu_item",
    "cas_preference_category",
    "cas_preference_item",
    "cas_stories_answer",
    "cas_stories_question",
    "cas_stories_trait_chooser",
    "clan",
    "clan_value",
    "club_interaction_group",
    "club_seed",
    "developmental_milestone",
    "headline",
    "holiday_tradition",
    "household_milestone",
    "lot_decoration_preset",
    "mood",
    "objective",
    "pie_menu_category",
    "region",
    "relbit",
    "reward",
    "season",
    "situation_job",
    "slot_type_set",
    "spell",
    "street",
    "trait",
    "tutorial",
    "tutorial_tip",
    "university",
    "university_course_data",
    "university_major",
    "user_interface_info",
    "venue",
    "weather_forecast",
    "zone_modifier"
  ]),
  alwaysClasses: new Set([
    "aspiration:Aspiration",
    "aspiration:AspirationAssignment",
    "aspiration:AspirationCareer",
    "aspiration:AspirationGig",
    "aspiration:AspirationOrganizationTask",
    "aspiration:AspirationSimInfoPanel",
    "aspiration:TimedAspiration",
    "aspiration:ZoneDirectorEventListener",
    "career_gig:ActiveGig",
    "career_gig:DecoratorGig",
    "career_gig:HomeAssignmentGig",
    "career_gig:RabbitholeGig",
    "drama_node:MajorOrganizationEventDramaNode",
    "object:Aquarium",
    "object:Baby",
    "object:Door",
    "object:Fire",
    "object:FireSprinklerHead",
    "object:Fish",
    "object:FishBowl",
    "object:HalfWall",
    "object:Jig",
    "object:Ocean",
    "object:Pond",
    "object:PoolSeat",
    "object:PrototypeObject",
    "object:Puddle",
    "object:Rug",
    "object:SectionalSofa",
    "object:SectionalSofaPiece",
    "object:Sim",
    "object:SwimmingPool",
    "object:Terrain",
    "recipe:MusicRecipe",
    "recipe:PaintByReferenceRecipe",
    "recipe:PaintingRecipe",
    "recipe:Recipe",
    "snippet:CurrencyBuck",
    "snippet:DisplaySnippet",
    "snippet:EcoFootprintState",
    "snippet:GlobalPolicy",
    "snippet:HorseCompetition",
    "snippet:HorseCompetitionCategory",
    "snippet:Organization",
    "snippet:Scenario",
    "snippet:ScenarioOutcome",
    "snippet:ScenarioPhase",
    "snippet:ScenarioRole",
    "snippet:ScenarioTag",
    "snippet:Scholarship",
    "snippet:StreetCivicPolicy",
    "snippet:VenueCivicPolicy",
    "statistic:BodyTypeLevelCommodity",
    "statistic:Commodity",
    "statistic:LifeSkillStatistic",
    "statistic:ModifiableStatistic",
    "statistic:RankedStatistic",
    "statistic:Skill",
    "statistic:Statistic"
  ]),
  sometimesClasses: new Set([
    "object:GameObject"
  ]),
};
