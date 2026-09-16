import { useState } from "react";
import { GMSetup, PCProfile, NPCAlly, Enemy } from "../types";

const INITIAL_SETUP: GMSetup = {
  sessionName: "",
  setting: "",
  tone: "Classic Heroic",
  difficulty: "Medium",
  encounterStructure: "Skirmish",
  objective: "Kill All Enemies",
  oneFightDay: false,
  pcs: [
    { 
      id: "1", name: "Thane", className: "Fighter", level: 5, weaponMasteries: "Graze, Push",
      subclass: "Battle Master", hp: { current: 45, max: 45 },
      stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 12 },
      powerMoves: "Action Surge, Precision Attack",
      magicItems: "+1 Greatsword",
      burstPotential: "standard",
      role: "Frontline",
      majorMagicItemsCount: 0,
      reactionDensity: "low"
    }
  ],
  gmOverrides: "",
  gmNotes: "",
  gmConcerns: "",
  gmRant: "",
  loreNotes: "",
  socialOut: false,
  socialOutContext: "",
  targetRounds: 4,
  encounterCount: 1,
  entryCondition: "fresh",
  targetOutcome: "safe_victory",
  letDiceFall: false,
  allies: [],
  enemies: [],
  allowExtraMinions: true,
  combatStyle: "Standard Brawl",
  targetExperience: "Heroic",
  failureConsequence: "narrative_setback",
  inspirationVelocity: "low",
  toyList: [],
  primaryMaterial: "Stone",
  licensingMode: "None",
  exportPriority: "Standard",
  partyArchetype: "Balanced Group"
};

export const CLASS_DEFAULTS: Record<string, Partial<PCProfile>> = {
  "Barbarian": { powerMoves: "Rage, Reckless Attack", weaponMasteries: "Graze, Topple" },
  "Fighter": { powerMoves: "Action Surge, Second Wind", weaponMasteries: "Push, Nick" },
  "Wizard": { powerMoves: "Fireball, Shield, Silvery Barbs", weaponMasteries: "Sap" },
  "Rogue": { powerMoves: "Sneak Attack, Cunning Action", weaponMasteries: "Vex, Nick" },
  "Paladin": { powerMoves: "Divine Smite, Lay on Hands", weaponMasteries: "Push" },
  "Cleric": { powerMoves: "Spirit Guardians, Guiding Bolt", weaponMasteries: "Sap" },
  "Bard": { powerMoves: "Bardic Inspiration, Vicious Mockery", weaponMasteries: "Slow" },
  "Druid": { powerMoves: "Wild Shape, Moonbeam", weaponMasteries: "Slow" },
  "Monk": { powerMoves: "Flurry of Blows, Stunning Strike", weaponMasteries: "Slow, Push" },
  "Ranger": { powerMoves: "Hunter's Mark, Zephyr Strike", weaponMasteries: "Slow, Vex" },
  "Sorcerer": { powerMoves: "Metamagic, Chaos Bolt", weaponMasteries: "Slow" },
  "Warlock": { powerMoves: "Eldritch Blast, Hex", weaponMasteries: "Slow" },
};

export function useSafeSetup() {
  const [setup, setSetup] = useState<GMSetup>(INITIAL_SETUP);
  const [clientName, setClientName] = useState("");

  const updatePC = (id: string, updates: Partial<PCProfile>) => {
    setSetup(prev => ({
      ...prev,
      pcs: (prev.pcs ?? []).map(pc => {
        if (pc.id === id) {
          const newPC = { ...pc, ...updates };
          if (updates.className && updates.className !== pc.className) {
            const defaults = CLASS_DEFAULTS[updates.className] || {};
            return { ...newPC, ...defaults };
          }
          return newPC;
        }
        return pc;
      })
    }));
  };

  const addPC = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newPC: PCProfile = { 
      id, name: "New Hero", className: "Fighter", level: 5, 
      weaponMasteries: "Push", 
      stats: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      hp: { current: 40, max: 40 },
      role: "Frontline"
    };
    setSetup(prev => ({
      ...prev,
      pcs: [...(prev.pcs ?? []), newPC]
    }));
  };

  const removePC = (id: string) => {
    setSetup(prev => ({
      ...prev,
      pcs: (prev.pcs ?? []).filter(pc => pc.id !== id)
    }));
  };

  const updateAlly = (id: string, updates: Partial<NPCAlly>) => {
    setSetup(prev => ({
      ...prev,
      allies: (prev.allies ?? []).map(ally => ally.id === id ? { ...ally, ...updates } : ally)
    }));
  };

  const addAlly = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlly: NPCAlly = { 
      id, name: "Allied Force", type: "General", description: "Town Guards, etc.", 
      role: "Frontline", quantity: 4, isIndependent: false, dismissOrganically: false 
    };
    setSetup(prev => ({
      ...prev,
      allies: [...(prev.allies ?? []), newAlly]
    }));
  };

  const removeAlly = (id: string) => {
    setSetup(prev => ({
      ...prev,
      allies: (prev.allies ?? []).filter(a => a.id !== id)
    }));
  };

  const updateEnemy = (id: string, updates: Partial<any>) => {
    setSetup(prev => ({
      ...prev,
      enemies: (prev.enemies ?? []).map(enemy => enemy.id === id ? { ...enemy, ...updates } : enemy)
    }));
  };

  const addEnemy = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEnemy: Enemy = { 
      id, name: "New Enemy", type: "Minion", description: "", 
      quantity: 1, isStatLocked: false, isFragile: false 
    };
    setSetup(prev => ({
      ...prev,
      enemies: [...(prev.enemies ?? []), newEnemy]
    }));
  };

  const removeEnemy = (id: string) => {
    setSetup(prev => ({
      ...prev,
      enemies: (prev.enemies ?? []).filter(e => e.id !== id)
    }));
  };

  return {
    setup,
    setSetup,
    clientName,
    setClientName,
    updatePC,
    addPC,
    removePC,
    updateAlly,
    addAlly,
    removeAlly,
    updateEnemy,
    addEnemy,
    removeEnemy
  };
}
