import { computed, Injectable, signal } from '@angular/core';

export type ScoutLevel = 'Daisy' | 'Brownie' | 'Junior' | 'Cadette' | 'Senior' | 'Ambassador';

export interface ParentContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
  authorizedPickup: boolean;
}

export interface Girl {
  id: string;
  firstName: string;
  lastName: string;
  level: ScoutLevel;
  schoolGrade: string;
  notes: string;
  parent: ParentContact;
  guardians: ParentContact[];
  authorizedPickupNames: string[];
}

export interface BadgeRequirement {
  id: string;
  title: string;
}

export interface Badge {
  id: string;
  title: string;
  level: ScoutLevel;
  topic: string;
  sourceUrl: string;
  requirements: BadgeRequirement[];
}

export interface EventCheckIn {
  droppedOffAt: string | null;
  droppedOffBy: string;
  pickedUpAt: string | null;
  pickedUpBy: string;
}

export type RsvpStatus = 'yes' | 'no' | 'maybe';

export interface EventRsvp {
  status: RsvpStatus;
  note: string;
  respondedAt: string;
}

export interface BadgeAward {
  badgeId: string;
  awardedAt: string;
  note: string;
}

export interface TroopEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  agenda: string;
  badgeIds: string[];
  attendance: Record<string, boolean>;
  completions: Record<string, Record<string, boolean>>;
  requirementWork: Record<string, boolean>;
  checkIns: Record<string, EventCheckIn>;
  rsvps: Record<string, EventRsvp>;
  completedAt: string | null;
}

export interface TroopState {
  girls: Girl[];
  badges: Badge[];
  events: TroopEvent[];
  badgeAwards: Record<string, BadgeAward[]>;
  manualCompletions: Record<string, Record<string, boolean>>;
}

export interface Troop {
  id: string;
  name: string;
  council: string;
  levels: ScoutLevel[];
  data: TroopState;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'leader' | 'parent';
  troopIds: string[];
  girlIds: string[];
}

export interface EmailReminderDraft {
  id: string;
  troopId: string;
  eventId: string;
  girlId: string;
  to: string;
  subject: string;
  body: string;
  status: 'draft';
  createdAt: string;
}

export interface AppState {
  accounts: Account[];
  troops: Troop[];
  emailReminderDrafts: EmailReminderDraft[];
  currentAccountId: string | null;
  currentTroopId: string | null;
}

export interface LoginResult {
  ok: boolean;
  message: string;
}

export interface CompleteEventResult {
  girlsUpdated: number;
  requirementsApplied: number;
  associationsCreated: number;
}

const STORAGE_KEY = 'troop-tracker-app-state-v2';
const LEGACY_STORAGE_KEY = 'troop-tracker-state-v1';

const emptyTroopState: TroopState = {
  girls: [],
  badges: [],
  events: [],
  badgeAwards: {},
  manualCompletions: {}
};

const badgeSource = 'https://www.girlscouts.org/en/members/for-girl-scouts/badges-journeys-awards/badge-explorer.html';

const starterTroopData: TroopState = {
  girls: [
    {
      id: 'girl-1',
      firstName: 'Maya',
      lastName: 'Johnson',
      level: 'Junior',
      schoolGrade: '4',
      notes: 'Prefers text reminders through parent.',
      parent: {
        name: 'Alicia Johnson',
        relationship: 'Parent',
        phone: '(555) 010-2314',
        email: 'alicia@example.com',
        authorizedPickup: true
      },
      guardians: [
        {
          name: 'Alicia Johnson',
          relationship: 'Parent',
          phone: '(555) 010-2314',
          email: 'alicia@example.com',
          authorizedPickup: true
        },
        {
          name: 'Marcus Johnson',
          relationship: 'Parent',
          phone: '(555) 010-6711',
          email: 'marcus@example.com',
          authorizedPickup: true
        }
      ],
      authorizedPickupNames: ['Alicia Johnson', 'Marcus Johnson', 'Renee Carter']
    },
    {
      id: 'girl-2',
      firstName: 'Sofia',
      lastName: 'Patel',
      level: 'Junior',
      schoolGrade: '5',
      notes: 'Cookie booth captain interest.',
      parent: {
        name: 'Nina Patel',
        relationship: 'Parent',
        phone: '(555) 010-9981',
        email: 'nina@example.com',
        authorizedPickup: true
      },
      guardians: [
        {
          name: 'Nina Patel',
          relationship: 'Parent',
          phone: '(555) 010-9981',
          email: 'nina@example.com',
          authorizedPickup: true
        }
      ],
      authorizedPickupNames: ['Nina Patel', 'Samir Patel']
    },
    {
      id: 'girl-3',
      firstName: 'Harper',
      lastName: 'Martinez',
      level: 'Cadette',
      schoolGrade: '6',
      notes: 'Interested in mentoring younger girls.',
      parent: {
        name: 'Elena Martinez',
        relationship: 'Parent',
        phone: '(555) 010-4482',
        email: 'elena@example.com',
        authorizedPickup: true
      },
      guardians: [
        {
          name: 'Elena Martinez',
          relationship: 'Parent',
          phone: '(555) 010-4482',
          email: 'elena@example.com',
          authorizedPickup: true
        }
      ],
      authorizedPickupNames: ['Elena Martinez', 'Carlos Martinez']
    },
    {
      id: 'girl-4',
      firstName: 'Lily',
      lastName: 'Chen',
      level: 'Cadette',
      schoolGrade: '7',
      notes: 'Working toward outdoor leadership badges.',
      parent: {
        name: 'Grace Chen',
        relationship: 'Parent',
        phone: '(555) 010-7764',
        email: 'grace@example.com',
        authorizedPickup: true
      },
      guardians: [
        {
          name: 'Grace Chen',
          relationship: 'Parent',
          phone: '(555) 010-7764',
          email: 'grace@example.com',
          authorizedPickup: true
        }
      ],
      authorizedPickupNames: ['Grace Chen', 'Mei Chen']
    }
  ],
  badges: [
    {
      id: 'badge-1',
      title: 'Junior Trail Adventure',
      level: 'Junior',
      topic: 'Outdoors',
      sourceUrl: badgeSource,
      requirements: [
        { id: 'badge-1-req-1', title: 'Choose your adventure route' },
        { id: 'badge-1-req-2', title: 'Prepare your gear and safety plan' },
        { id: 'badge-1-req-3', title: 'Practice an outdoor skill' },
        { id: 'badge-1-req-4', title: 'Complete the adventure' },
        { id: 'badge-1-req-5', title: 'Reflect and share what you learned' }
      ]
    },
    {
      id: 'badge-2',
      title: 'Junior Coding Basics',
      level: 'Junior',
      topic: 'STEM',
      sourceUrl: badgeSource,
      requirements: [
        { id: 'badge-2-req-1', title: 'Create step-by-step instructions' },
        { id: 'badge-2-req-2', title: 'Debug a sequence' },
        { id: 'badge-2-req-3', title: 'Build an algorithm' },
        { id: 'badge-2-req-4', title: 'Use loops or patterns' },
        { id: 'badge-2-req-5', title: 'Share your coding solution' }
      ]
    },
    {
      id: 'badge-3',
      title: 'Brownie First Aid',
      level: 'Brownie',
      topic: 'Life Skills',
      sourceUrl: badgeSource,
      requirements: [
        { id: 'badge-3-req-1', title: 'Learn how to get help' },
        { id: 'badge-3-req-2', title: 'Talk to first responders' },
        { id: 'badge-3-req-3', title: 'Make a first-aid kit' },
        { id: 'badge-3-req-4', title: 'Know how to treat minor injuries' },
        { id: 'badge-3-req-5', title: 'Create a safety plan' }
      ]
    },
    {
      id: 'badge-4',
      title: 'Cadette Outdoor Art Apprentice',
      level: 'Cadette',
      topic: 'Outdoors',
      sourceUrl: badgeSource,
      requirements: [
        { id: 'badge-4-req-1', title: 'Explore outdoor art ideas' },
        { id: 'badge-4-req-2', title: 'Create art inspired by nature' },
        { id: 'badge-4-req-3', title: 'Learn from an outdoor artist' },
        { id: 'badge-4-req-4', title: 'Make something useful outdoors' },
        { id: 'badge-4-req-5', title: 'Share your outdoor art' }
      ]
    }
  ],
  manualCompletions: {},
  badgeAwards: {
    'girl-1': [
      {
        badgeId: 'badge-2',
        awardedAt: new Date().toISOString().slice(0, 10),
        note: 'Completed coding activity outside a troop meeting.'
      }
    ],
    'girl-3': [
      {
        badgeId: 'badge-4',
        awardedAt: new Date().toISOString().slice(0, 10),
        note: 'Started outdoor art work during a council workshop.'
      }
    ]
  },
  events: [
    {
      id: 'event-1',
      title: 'Trail Planning Meeting',
      date: new Date().toISOString().slice(0, 10),
      startTime: '18:00',
      location: 'Community Room',
      agenda: 'Plan hiking route, review gear, and complete badge prep requirements.',
      badgeIds: ['badge-1', 'badge-4'],
      attendance: { 'girl-1': true, 'girl-2': false },
      rsvps: {
        'girl-1': {
          status: 'yes',
          note: '',
          respondedAt: new Date().toISOString()
        }
      },
      checkIns: {
        'girl-1': {
          droppedOffAt: new Date().toISOString(),
          droppedOffBy: 'Alicia Johnson',
          pickedUpAt: null,
          pickedUpBy: ''
        }
      },
      requirementWork: {
        'badge-1-req-1': true,
        'badge-1-req-2': true,
        'badge-4-req-1': true
      },
      completions: {
        'girl-1': {
          'badge-1-req-1': true,
          'badge-1-req-2': true
        }
      },
      completedAt: null
    },
    {
      id: 'event-2',
      title: 'Mixed Level Badge Studio',
      date: new Date().toISOString().slice(0, 10),
      startTime: '19:00',
      location: 'Art Room',
      agenda: 'Juniors continue trail planning while Cadettes work on outdoor art activities.',
      badgeIds: ['badge-1', 'badge-4'],
      attendance: { 'girl-1': true, 'girl-3': true, 'girl-4': false },
      rsvps: {
        'girl-1': {
          status: 'yes',
          note: '',
          respondedAt: new Date().toISOString()
        },
        'girl-3': {
          status: 'yes',
          note: 'Will bring sketchbook.',
          respondedAt: new Date().toISOString()
        }
      },
      checkIns: {
        'girl-1': {
          droppedOffAt: new Date().toISOString(),
          droppedOffBy: 'Alicia Johnson',
          pickedUpAt: null,
          pickedUpBy: ''
        },
        'girl-3': {
          droppedOffAt: new Date().toISOString(),
          droppedOffBy: 'Elena Martinez',
          pickedUpAt: null,
          pickedUpBy: ''
        }
      },
      requirementWork: {
        'badge-1-req-3': true,
        'badge-4-req-1': true,
        'badge-4-req-2': true
      },
      completions: {},
      completedAt: null
    }
  ]
};

const starterState: AppState = {
  accounts: [
    {
      id: 'account-demo',
      name: 'Troop Leader',
      email: 'leader@example.com',
      passwordHash: hashPassword('troop123'),
      role: 'leader',
      troopIds: ['troop-1001', 'troop-2045'],
      girlIds: []
    },
    {
      id: 'account-parent-alicia',
      name: 'Alicia Johnson',
      email: 'alicia@example.com',
      passwordHash: hashPassword('parent123'),
      role: 'parent',
      troopIds: ['troop-1001'],
      girlIds: ['girl-1']
    },
    {
      id: 'account-parent-nina',
      name: 'Nina Patel',
      email: 'nina@example.com',
      passwordHash: hashPassword('parent123'),
      role: 'parent',
      troopIds: ['troop-1001'],
      girlIds: ['girl-2']
    },
    {
      id: 'account-parent-elena',
      name: 'Elena Martinez',
      email: 'elena@example.com',
      passwordHash: hashPassword('parent123'),
      role: 'parent',
      troopIds: ['troop-1001'],
      girlIds: ['girl-3']
    },
    {
      id: 'account-parent-grace',
      name: 'Grace Chen',
      email: 'grace@example.com',
      passwordHash: hashPassword('parent123'),
      role: 'parent',
      troopIds: ['troop-1001'],
      girlIds: ['girl-4']
    }
  ],
  troops: [
    {
      id: 'troop-1001',
      name: 'Troop 1001',
      council: 'Local Council',
      levels: ['Junior', 'Cadette'],
      data: starterTroopData
    },
    {
      id: 'troop-2045',
      name: 'Troop 2045',
      council: 'Local Council',
      levels: ['Brownie', 'Junior'],
      data: {
        ...emptyTroopState,
        badges: starterTroopData.badges
      }
    }
  ],
  emailReminderDrafts: [],
  currentAccountId: null,
  currentTroopId: null
};

@Injectable({ providedIn: 'root' })
export class TroopDataService {
  private readonly state = signal<AppState>(this.load());

  readonly app = this.state.asReadonly();

  readonly currentAccount = computed(() => {
    const accountId = this.state().currentAccountId;
    return this.state().accounts.find((account) => account.id === accountId) ?? null;
  });

  readonly availableTroops = computed(() => {
    const account = this.currentAccount();
    if (!account) {
      return [];
    }

    return this.state().troops.filter((troop) => account.troopIds.includes(troop.id));
  });

  readonly currentTroop = computed(() => {
    const troopId = this.state().currentTroopId;
    const accountTroops = this.availableTroops();
    return accountTroops.find((troop) => troop.id === troopId) ?? accountTroops[0] ?? null;
  });

  readonly data = computed(() => this.currentTroop()?.data ?? emptyTroopState);

  readonly parentGirls = computed(() => {
    const account = this.currentAccount();
    const troop = this.currentTroop();
    if (!account || account.role !== 'parent' || !troop) {
      return [];
    }

    return troop.data.girls.filter((girl) => account.girlIds.includes(girl.id));
  });

  readonly emailReminderDrafts = computed(() => {
    const troop = this.currentTroop();
    if (!troop) {
      return [];
    }

    return this.state().emailReminderDrafts.filter((draft) => draft.troopId === troop.id);
  });

  login(email: string, password: string): LoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    const account = this.state().accounts.find((item) => item.email.toLowerCase() === normalizedEmail);

    if (!account || account.passwordHash !== hashPassword(password)) {
      return { ok: false, message: 'Email or password did not match.' };
    }

    this.state.update((current) => ({
      ...current,
      currentAccountId: account.id,
      currentTroopId: account.troopIds[0] ?? null
    }));
    this.persist();
    return { ok: true, message: 'Signed in.' };
  }

  registerAccount(name: string, email: string, password: string, troopName: string): LoginResult {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.state().accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, message: 'An account already exists for that email.' };
    }

    const accountId = crypto.randomUUID();
    const troopId = crypto.randomUUID();
    const account: Account = {
      id: accountId,
      name: name.trim() || 'Troop Leader',
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: 'leader',
      troopIds: [troopId],
      girlIds: []
    };
    const troop: Troop = {
      id: troopId,
      name: troopName.trim() || 'New Troop',
      council: '',
      levels: ['Junior'],
      data: {
        ...emptyTroopState,
        badges: starterTroopData.badges
      }
    };

    this.state.update((current) => ({
      ...current,
      accounts: [...current.accounts, account],
      troops: [...current.troops, troop],
      currentAccountId: accountId,
      currentTroopId: troopId
    }));
    this.persist();
    return { ok: true, message: 'Account created.' };
  }

  logout(): void {
    this.state.update((current) => ({
      ...current,
      currentAccountId: null,
      currentTroopId: null
    }));
    this.persist();
  }

  switchTroop(troopId: string): void {
    if (!this.availableTroops().some((troop) => troop.id === troopId)) {
      return;
    }

    this.state.update((current) => ({ ...current, currentTroopId: troopId }));
    this.persist();
  }

  addTroop(name: string, council: string, levels: ScoutLevel[]): void {
    const account = this.currentAccount();
    if (!account) {
      return;
    }

    const troopId = crypto.randomUUID();
    const troop: Troop = {
      id: troopId,
      name: name.trim(),
      council: council.trim(),
      levels: levels.length > 0 ? levels : ['Junior'],
      data: {
        ...emptyTroopState,
        badges: starterTroopData.badges
      }
    };

    this.state.update((current) => ({
      ...current,
      accounts: current.accounts.map((item) =>
        item.id === account.id ? { ...item, troopIds: [...item.troopIds, troopId] } : item
      ),
      troops: [...current.troops, troop],
      currentTroopId: troopId
    }));
    this.persist();
  }

  addGirl(girl: Omit<Girl, 'id'>): void {
    const troop = this.currentTroop();
    if (!troop) {
      return;
    }

    const newGirl = { ...girl, id: crypto.randomUUID() };
    this.state.update((current) => ({
      ...current,
      accounts: upsertParentAccounts(current.accounts, troop.id, newGirl),
      troops: current.troops.map((item) =>
        item.id === troop.id ? { ...item, data: { ...item.data, girls: [...item.data.girls, newGirl] } } : item
      )
    }));
    this.persist();
  }

  updateGirl(girlId: string, girl: Omit<Girl, 'id'>): void {
    const troop = this.currentTroop();
    if (!troop) {
      return;
    }

    const updatedGirl = { ...girl, id: girlId };
    this.state.update((current) => ({
      ...current,
      accounts: upsertParentAccounts(unlinkGirlFromParentAccounts(current.accounts, girlId), troop.id, updatedGirl),
      troops: current.troops.map((item) =>
        item.id === troop.id
          ? {
              ...item,
              data: {
                ...item.data,
                girls: item.data.girls.map((existingGirl) => (existingGirl.id === girlId ? updatedGirl : existingGirl))
              }
            }
          : item
      )
    }));
    this.persist();
  }

  updateEventDetails(
    eventId: string,
    event: Pick<TroopEvent, 'title' | 'date' | 'startTime' | 'location' | 'agenda' | 'badgeIds'>
  ): void {
    this.updateEvent(eventId, (currentEvent) => ({
      ...currentEvent,
      ...event
    }));
  }

  updateBadge(badgeId: string, badge: Omit<Badge, 'id'>): void {
    this.patchTroopData({
      badges: this.data().badges.map((existingBadge) =>
        existingBadge.id === badgeId
          ? {
              ...badge,
              id: badgeId,
              requirements: badge.requirements.map((requirement, index) => ({
                ...requirement,
                id: requirement.id || `${badgeId}-req-${index + 1}`
              }))
            }
          : existingBadge
      )
    });
  }

  addBadge(badge: Omit<Badge, 'id'>): void {
    const id = crypto.randomUUID();
    this.patchTroopData({
      badges: [
        ...this.data().badges,
        {
          ...badge,
          id,
          requirements: badge.requirements.map((requirement, index) => ({
            ...requirement,
            id: requirement.id || `${id}-req-${index + 1}`
          }))
        }
      ]
    });
  }

  addEvent(
    event: Omit<
      TroopEvent,
      'id' | 'attendance' | 'completions' | 'requirementWork' | 'checkIns' | 'rsvps' | 'completedAt'
    >
  ): void {
    this.patchTroopData({
      events: [
        ...this.data().events,
        {
          ...event,
          id: crypto.randomUUID(),
          attendance: {},
          completions: {},
          requirementWork: {},
          checkIns: {},
          rsvps: {},
          completedAt: null
        }
      ]
    });
  }

  toggleAttendance(eventId: string, girlId: string): void {
    this.updateEvent(eventId, (event) => ({
      ...event,
      attendance: {
        ...event.attendance,
        [girlId]: !event.attendance[girlId]
      }
    }));
  }

  markAttended(eventId: string, girlId: string): void {
    this.updateEvent(eventId, (event) => ({
      ...event,
      attendance: {
        ...event.attendance,
        [girlId]: true
      }
    }));
  }

  toggleRequirement(eventId: string, girlId: string, requirementId: string): void {
    this.updateEvent(eventId, (event) => ({
      ...event,
      completions: {
        ...event.completions,
        [girlId]: {
          ...(event.completions[girlId] ?? {}),
          [requirementId]: !(event.completions[girlId]?.[requirementId] ?? false)
        }
      }
    }));
  }

  toggleMeetingRequirement(eventId: string, requirementId: string): void {
    this.updateEvent(eventId, (event) => ({
      ...event,
      requirementWork: {
        ...event.requirementWork,
        [requirementId]: !event.requirementWork[requirementId]
      }
    }));
  }

  completeRequirementForGirl(girlId: string, requirementId: string): void {
    this.patchTroopData({
      manualCompletions: {
        ...this.data().manualCompletions,
        [girlId]: {
          ...(this.data().manualCompletions[girlId] ?? {}),
          [requirementId]: true
        }
      }
    });
  }

  completeEvent(eventId: string): CompleteEventResult {
    let result: CompleteEventResult = {
      girlsUpdated: 0,
      requirementsApplied: 0,
      associationsCreated: 0
    };

    this.updateEvent(eventId, (event) => {
      const eventBadges = event.badgeIds
        .map((badgeId) => this.data().badges.find((badge) => badge.id === badgeId))
        .filter((badge): badge is Badge => Boolean(badge));
      const completedRequirements = eventBadges.flatMap((badge) =>
        badge.requirements
          .filter((requirement) => event.requirementWork[requirement.id])
          .map((requirement) => ({
            badgeLevel: badge.level,
            requirementId: requirement.id
          }))
      );
      const nextCompletions = { ...event.completions };
      const updatedGirlIds = new Set<string>();

      completedRequirements.forEach(({ badgeLevel, requirementId }) => {
        this.data().girls
          .filter((girl) => girl.level === badgeLevel && event.attendance[girl.id])
          .forEach((girl) => {
            const girlCompletions = nextCompletions[girl.id] ?? {};

            if (!girlCompletions[requirementId]) {
              result.associationsCreated += 1;
              updatedGirlIds.add(girl.id);
            }

            nextCompletions[girl.id] = {
              ...girlCompletions,
              [requirementId]: true
            };
          });
      });

      result = {
        ...result,
        girlsUpdated: updatedGirlIds.size,
        requirementsApplied: completedRequirements.length
      };

      return {
        ...event,
        completions: nextCompletions,
        completedAt: new Date().toISOString()
      };
    });

    return result;
  }

  recordDropOff(eventId: string, girlId: string, guardianName: string): void {
    this.updateEvent(eventId, (event) => {
      const current = event.checkIns[girlId] ?? emptyCheckIn();
      return {
        ...event,
        attendance: {
          ...event.attendance,
          [girlId]: true
        },
        checkIns: {
          ...event.checkIns,
          [girlId]: {
            ...current,
            droppedOffAt: new Date().toISOString(),
            droppedOffBy: guardianName.trim(),
            pickedUpAt: null,
            pickedUpBy: ''
          }
        }
      };
    });
  }

  recordPickUp(eventId: string, girlId: string, guardianName: string): void {
    this.updateEvent(eventId, (event) => {
      const current = event.checkIns[girlId] ?? emptyCheckIn();
      return {
        ...event,
        checkIns: {
          ...event.checkIns,
          [girlId]: {
            ...current,
            pickedUpAt: new Date().toISOString(),
            pickedUpBy: guardianName.trim()
          }
        }
      };
    });
  }

  recordRsvp(eventId: string, girlId: string, status: RsvpStatus, note: string): void {
    this.updateEvent(eventId, (event) => ({
      ...event,
      rsvps: {
        ...event.rsvps,
        [girlId]: {
          status,
          note: note.trim(),
          respondedAt: new Date().toISOString()
        }
      }
    }));
  }

  awardBadge(girlId: string, badgeId: string, awardedAt: string, note: string): void {
    const currentAwards = this.data().badgeAwards[girlId] ?? [];
    const existingAwardIndex = currentAwards.findIndex((award) => award.badgeId === badgeId);
    const award: BadgeAward = {
      badgeId,
      awardedAt,
      note: note.trim()
    };
    const nextAwards =
      existingAwardIndex >= 0
        ? currentAwards.map((currentAward, index) => (index === existingAwardIndex ? award : currentAward))
        : [...currentAwards, award];

    this.patchTroopData({
      badgeAwards: {
        ...this.data().badgeAwards,
        [girlId]: nextAwards
      }
    });
  }

  prepareReminderDrafts(daysBefore: number): number {
    const troop = this.currentTroop();
    if (!troop) {
      return 0;
    }

    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + daysBefore);
    const upcomingEvents = troop.data.events.filter((event) => {
      const eventDate = new Date(`${event.date}T${event.startTime || '00:00'}`);
      return eventDate >= startOfDay(now) && eventDate <= endOfDay(maxDate);
    });

    const drafts = upcomingEvents.flatMap((event) =>
      troop.data.girls
        .filter((girl) => Boolean(girl.parent.email))
        .map((girl) => createReminderDraft(troop, event, girl))
    );

    const existingKeys = new Set(
      this.state().emailReminderDrafts.map((draft) => `${draft.troopId}:${draft.eventId}:${draft.girlId}`)
    );
    const newDrafts = drafts.filter((draft) => !existingKeys.has(`${draft.troopId}:${draft.eventId}:${draft.girlId}`));

    this.state.update((current) => ({
      ...current,
      emailReminderDrafts: [...current.emailReminderDrafts, ...newDrafts]
    }));
    this.persist();
    return newDrafts.length;
  }

  resetDemoData(): void {
    this.state.set(starterState);
    this.persist();
  }

  private updateEvent(eventId: string, updater: (event: TroopEvent) => TroopEvent): void {
    this.patchTroopData({
      events: this.data().events.map((event) => (event.id === eventId ? updater(event) : event))
    });
  }

  private patchTroopData(partial: Partial<TroopState>): void {
    const troop = this.currentTroop();
    if (!troop) {
      return;
    }

    this.state.update((current) => ({
      ...current,
      troops: current.troops.map((item) =>
        item.id === troop.id ? { ...item, data: { ...item.data, ...partial } } : item
      )
    }));
    this.persist();
  }

  private load(): AppState {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (rawState) {
      try {
        return normalizeState(JSON.parse(rawState) as AppState);
      } catch {
        return starterState;
      }
    }

    const legacyState = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyState) {
      try {
        const troopData = JSON.parse(legacyState) as TroopState;
        return {
          ...starterState,
          troops: [{ ...starterState.troops[0], data: normalizeTroopState(troopData) }, starterState.troops[1]]
        };
      } catch {
        return starterState;
      }
    }

    return starterState;
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
  }
}

function hashPassword(password: string): string {
  return btoa(`troop-tracker:${password}`);
}

function normalizeState(state: AppState): AppState {
  const normalizedState = {
    ...state,
    emailReminderDrafts: state.emailReminderDrafts ?? [],
    accounts: state.accounts.map((account) => ({
      ...account,
      role: account.role ?? 'leader',
      troopIds: account.troopIds ?? [],
      girlIds: account.girlIds ?? []
    })),
    troops: state.troops.map((troop) => {
      const legacyTroop = troop as Troop & { levelFocus?: ScoutLevel };
      const levels: ScoutLevel[] = troop.levels ?? (legacyTroop.levelFocus ? [legacyTroop.levelFocus] : ['Junior']);
      return {
        ...troop,
        levels:
          troop.id === 'troop-1001' && !levels.includes('Cadette')
            ? [...levels, 'Cadette' as ScoutLevel]
            : levels,
        data: normalizeTroopState(addStarterCadetteSamples(troop.id, troop.data))
      };
    })
  };

  return {
    ...normalizedState,
    accounts: normalizedState.troops.reduce(
      (accounts, troop) =>
        troop.data.girls.reduce((nextAccounts, girl) => upsertParentAccounts(nextAccounts, troop.id, girl), accounts),
      normalizedState.accounts
    )
  };
}

function normalizeTroopState(state: TroopState): TroopState {
  return {
    ...state,
    girls: state.girls.map(normalizeGirl),
    badgeAwards: state.badgeAwards ?? {},
    manualCompletions: state.manualCompletions ?? {},
    events: state.events.map((event) => ({
      ...event,
      requirementWork: event.requirementWork ?? requirementWorkFromCompletions(event.completions ?? {}),
      checkIns: event.checkIns ?? {},
      rsvps: event.rsvps ?? {},
      completedAt: event.completedAt ?? null
    }))
  };
}

function normalizeGirl(girl: Girl): Girl {
  const parent = normalizeGuardian(girl.parent);
  const guardians = (girl.guardians?.length ? girl.guardians : [parent]).map(normalizeGuardian);
  const authorizedPickupNames =
    girl.authorizedPickupNames?.length
      ? girl.authorizedPickupNames
      : guardians.filter((guardian) => guardian.authorizedPickup).map((guardian) => guardian.name);

  return {
    ...girl,
    parent,
    guardians,
    authorizedPickupNames
  };
}

function normalizeGuardian(guardian: ParentContact): ParentContact {
  return {
    ...guardian,
    authorizedPickup: guardian.authorizedPickup ?? true
  };
}

function addStarterCadetteSamples(troopId: string, state: TroopState): TroopState {
  if (troopId !== 'troop-1001') {
    return state;
  }

  return {
    ...state,
    girls: mergeById(state.girls, starterTroopData.girls.filter((girl) => girl.level === 'Cadette')),
    badges: mergeById(state.badges, starterTroopData.badges.filter((badge) => badge.level === 'Cadette')),
    events: mergeById(state.events, starterTroopData.events.filter((event) => event.id === 'event-2')).map((event) =>
      event.id === 'event-1'
        ? {
            ...event,
            badgeIds: event.badgeIds.includes('badge-4') ? event.badgeIds : [...event.badgeIds, 'badge-4'],
            requirementWork: {
              ...event.requirementWork,
              'badge-4-req-1': event.requirementWork['badge-4-req-1'] ?? true
            }
          }
        : event
    ),
    badgeAwards: {
      ...starterTroopData.badgeAwards,
      ...state.badgeAwards
    },
    manualCompletions: state.manualCompletions ?? {}
  };
}

function mergeById<T extends { id: string }>(current: T[], additions: T[]): T[] {
  const currentIds = new Set(current.map((item) => item.id));
  return [...current, ...additions.filter((item) => !currentIds.has(item.id))];
}

function requirementWorkFromCompletions(completions: Record<string, Record<string, boolean>>): Record<string, boolean> {
  return Object.values(completions).reduce<Record<string, boolean>>((work, girlCompletions) => {
    Object.entries(girlCompletions).forEach(([requirementId, completed]) => {
      if (completed) {
        work[requirementId] = true;
      }
    });
    return work;
  }, {});
}

function emptyCheckIn(): EventCheckIn {
  return {
    droppedOffAt: null,
    droppedOffBy: '',
    pickedUpAt: null,
    pickedUpBy: ''
  };
}

function createReminderDraft(troop: Troop, event: TroopEvent, girl: Girl): EmailReminderDraft {
  return {
    id: crypto.randomUUID(),
    troopId: troop.id,
    eventId: event.id,
    girlId: girl.id,
    to: girl.parent.email,
    subject: `${troop.name} reminder: ${event.title}`,
    body: `Hi ${girl.parent.name || 'there'},\n\nReminder that ${girl.firstName} has ${event.title} on ${event.date} at ${event.startTime}. Location: ${event.location || 'TBD'}.\n\nPlease RSVP in Troop Tracker when you can.\n\nThis is a draft only and has not been sent.`,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function upsertParentAccounts(accounts: Account[], troopId: string, girl: Girl): Account[] {
  return girl.guardians.reduce(
    (nextAccounts, guardian) => upsertParentAccount(nextAccounts, troopId, girl, guardian),
    accounts
  );
}

function upsertParentAccount(accounts: Account[], troopId: string, girl: Girl, guardian: ParentContact): Account[] {
  const email = guardian.email.trim().toLowerCase();
  if (!email) {
    return accounts;
  }

  const existing = accounts.find((account) => account.email.toLowerCase() === email);
  if (!existing) {
    return [
      ...accounts,
      {
        id: crypto.randomUUID(),
        name: guardian.name || `${girl.firstName} ${girl.lastName} Guardian`,
        email,
        passwordHash: hashPassword('parent123'),
        role: 'parent',
        troopIds: [troopId],
        girlIds: [girl.id]
      }
    ];
  }

  return accounts.map((account) =>
    account.id === existing.id
      ? {
          ...account,
          role: account.role === 'leader' ? account.role : 'parent',
          troopIds: account.troopIds.includes(troopId) ? account.troopIds : [...account.troopIds, troopId],
          girlIds: account.girlIds.includes(girl.id) ? account.girlIds : [...account.girlIds, girl.id]
        }
      : account
  );
}

function unlinkGirlFromParentAccounts(accounts: Account[], girlId: string): Account[] {
  return accounts.map((account) =>
    account.role === 'parent'
      ? {
          ...account,
          girlIds: account.girlIds.filter((id) => id !== girlId)
        }
      : account
  );
}
