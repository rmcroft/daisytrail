import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkCircle,
  clipboardOutline,
  closeOutline,
  createOutline,
  funnelOutline,
  logInOutline,
  logOutOutline,
  mailOutline,
  medalOutline,
  peopleOutline,
  personAddOutline,
  refreshOutline,
  ribbonOutline,
  saveOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import {
  Badge,
  BadgeRequirement,
  Girl,
  ParentContact,
  RsvpStatus,
  ScoutLevel,
  TroopDataService,
  TroopEvent
} from './troop-data.service';

interface GirlBadgeProgress {
  badge: Badge;
  completedRequirements: BadgeRequirement[];
  remainingRequirements: BadgeRequirement[];
  totalRequirements: number;
  completedCount: number;
  status: 'complete' | 'partial' | 'not-started';
  awardedAt: string | null;
}

type BadgeProgressSegment = 'all' | 'started' | 'completed';

const scoutLevels: ScoutLevel[] = ['Daisy', 'Brownie', 'Junior', 'Cadette', 'Senior', 'Ambassador'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly fb = inject(FormBuilder);
  private readonly troopData = inject(TroopDataService);
  private readonly alertController = inject(AlertController);

  readonly state = this.troopData.data;
  readonly currentAccount = this.troopData.currentAccount;
  readonly currentTroop = this.troopData.currentTroop;
  readonly availableTroops = this.troopData.availableTroops;
  readonly parentGirls = this.troopData.parentGirls;
  readonly emailReminderDrafts = this.troopData.emailReminderDrafts;
  readonly levels = scoutLevels;
  readonly selectedEventId = signal<string | null>(this.state().events[0]?.id ?? null);
  readonly selectedSegment = signal<'dashboard' | 'girls' | 'schedule' | 'badges' | 'troops' | 'updates'>('dashboard');
  readonly authMode = signal<'login' | 'register'>('login');
  readonly authMessage = signal('');
  readonly updateMessage = signal('');
  readonly eventCompleteMessage = signal('');
  readonly showAddGirlForm = signal(false);
  readonly showAddEventForm = signal(false);
  readonly showAddBadgeForm = signal(false);
  readonly editingGirlId = signal<string | null>(null);
  readonly selectedGirlId = signal<string | null>(null);
  readonly editingEventId = signal<string | null>(null);
  readonly editingBadgeId = signal<string | null>(null);
  readonly badgeProgressSegment = signal<BadgeProgressSegment>('all');
  readonly girlLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly badgeLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly eventBadgeLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly eventBadgeSearch = signal('');
  readonly badgeSourceUrl = 'https://www.girlscouts.org/en/members/for-girl-scouts/badges-journeys-awards/badge-explorer.html';

  readonly selectedEvent = computed(() => {
    const selectedId = this.selectedEventId();
    return this.state().events.find((event) => event.id === selectedId) ?? this.state().events[0] ?? null;
  });

  readonly upcomingEvents = computed(() =>
    [...this.state().events].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
  );

  readonly parentUpcomingEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.upcomingEvents().filter((event) => new Date(`${event.date}T${event.startTime || '00:00'}`) >= today);
  });

  readonly selectedEventBadges = computed(() => {
    const event = this.selectedEvent();
    if (!event) {
      return [];
    }

    return event.badgeIds
      .map((badgeId) => this.state().badges.find((badge) => badge.id === badgeId))
      .filter((badge): badge is Badge => Boolean(badge))
      .filter((badge) => this.badgeLevelFilter() === 'All' || badge.level === this.badgeLevelFilter());
  });

  readonly filteredGirls = computed(() =>
    this.state().girls.filter((girl) => this.girlLevelFilter() === 'All' || girl.level === this.girlLevelFilter())
  );

  readonly troopLevelLabel = computed(() => {
    const levels = this.currentTroop()?.levels ?? [];
    return levels.length > 0 ? levels.join(', ') : 'No levels set';
  });

  readonly currentTroopId = computed(() => this.currentTroop()?.id ?? '');
  readonly currentTroopName = computed(() => this.currentTroop()?.name ?? 'No troop selected');

  readonly troopBadges = computed(() => {
    const troopLevels = this.currentTroop()?.levels ?? [];
    return this.state().badges.filter((badge) => troopLevels.length === 0 || troopLevels.includes(badge.level));
  });

  readonly allSelectedEventBadges = computed(() => {
    const event = this.selectedEvent();
    if (!event) {
      return [];
    }

    return event.badgeIds
      .map((badgeId) => this.state().badges.find((badge) => badge.id === badgeId))
      .filter((badge): badge is Badge => Boolean(badge));
  });

  readonly selectedGirl = computed(() => {
    const girlId = this.selectedGirlId();
    return this.state().girls.find((girl) => girl.id === girlId) ?? null;
  });

  readonly editingEvent = computed(() => {
    const eventId = this.editingEventId();
    return this.state().events.find((event) => event.id === eventId) ?? null;
  });

  readonly editingBadge = computed(() => {
    const badgeId = this.editingBadgeId();
    return this.state().badges.find((badge) => badge.id === badgeId) ?? null;
  });

  readonly eventBadgeOptions = computed(() => {
    const search = this.eventBadgeSearch().trim().toLowerCase();

    return this.troopBadges().filter((badge) => {
      const matchesLevel = this.eventBadgeLevelFilter() === 'All' || badge.level === this.eventBadgeLevelFilter();
      const matchesSearch =
        !search ||
        badge.title.toLowerCase().includes(search) ||
        badge.topic.toLowerCase().includes(search) ||
        badge.level.toLowerCase().includes(search);

      return matchesLevel && matchesSearch;
    });
  });

  readonly girlForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    level: ['Junior' as ScoutLevel, Validators.required],
    schoolGrade: [''],
    notes: [''],
    parentName: ['', Validators.required],
    parentRelationship: ['Parent'],
    parentPhone: [''],
    parentEmail: ['', Validators.email],
    additionalGuardians: [''],
    authorizedPickupNames: ['']
  });

  readonly editGirlForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    level: ['Junior' as ScoutLevel, Validators.required],
    schoolGrade: [''],
    notes: [''],
    parentName: ['', Validators.required],
    parentRelationship: ['Parent'],
    parentPhone: [''],
    parentEmail: ['', Validators.email],
    additionalGuardians: [''],
    authorizedPickupNames: ['']
  });

  readonly eventForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    startTime: ['18:00', Validators.required],
    location: [''],
    agenda: [''],
    badgeIds: [[] as string[]]
  });

  readonly editEventForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    location: [''],
    agenda: [''],
    badgeIds: [[] as string[]]
  });

  readonly badgeForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    level: ['Junior' as ScoutLevel, Validators.required],
    topic: [''],
    requirements: ['']
  });

  readonly editBadgeForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    level: ['Junior' as ScoutLevel, Validators.required],
    topic: [''],
    requirements: ['']
  });

  readonly authForm = this.fb.nonNullable.group({
    name: [''],
    email: ['leader@example.com', [Validators.required, Validators.email]],
    password: ['troop123', [Validators.required, Validators.minLength(6)]],
    troopName: ['Troop 1001']
  });

  readonly troopForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    council: [''],
    levels: [['Junior'] as ScoutLevel[], Validators.required]
  });

  readonly checkInForm = this.fb.nonNullable.group({
    girlId: ['', Validators.required],
    guardianName: ['', Validators.required]
  });

  readonly rsvpForm = this.fb.nonNullable.group({
    note: ['']
  });

  readonly reminderForm = this.fb.nonNullable.group({
    daysBefore: [7, [Validators.required, Validators.min(1)]]
  });

  readonly badgeAwardForm = this.fb.nonNullable.group({
    girlId: ['', Validators.required],
    badgeId: ['', Validators.required],
    awardedAt: [new Date().toISOString().slice(0, 10), Validators.required],
    note: ['']
  });

  readonly badgeGivenForm = this.fb.nonNullable.group({
    givenAt: [new Date().toISOString().slice(0, 10), Validators.required]
  });

  constructor() {
    addIcons({
      calendarOutline,
      checkmarkCircle,
      closeOutline,
      clipboardOutline,
      createOutline,
      funnelOutline,
      logInOutline,
      logOutOutline,
      mailOutline,
      medalOutline,
      peopleOutline,
      personAddOutline,
      refreshOutline,
      ribbonOutline,
      saveOutline,
      shieldCheckmarkOutline
    });
  }

  submitAuth(): void {
    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    const form = this.authForm.getRawValue();
    const result =
      this.authMode() === 'login'
        ? this.troopData.login(form.email, form.password)
        : this.troopData.registerAccount(form.name, form.email, form.password, form.troopName);

    this.authMessage.set(result.message);
    if (result.ok) {
      this.selectedEventId.set(this.state().events[0]?.id ?? null);
      this.selectedSegment.set('dashboard');
    }
  }

  logout(): void {
    this.troopData.logout();
    this.authMessage.set('');
    this.selectedSegment.set('dashboard');
  }

  setSelectedSegment(segment: 'dashboard' | 'girls' | 'schedule' | 'badges' | 'troops' | 'updates'): void {
    this.selectedSegment.set(segment);
    this.editingEventId.set(null);
    this.editEventForm.reset({ badgeIds: [] });
    this.editingBadgeId.set(null);
  }

  switchTroop(troopId: string): void {
    this.troopData.switchTroop(troopId);
    this.selectedEventId.set(this.state().events[0]?.id ?? null);
  }

  addTroop(): void {
    if (this.troopForm.invalid) {
      this.troopForm.markAllAsTouched();
      return;
    }

    const form = this.troopForm.getRawValue();
    this.troopData.addTroop(form.name, form.council, form.levels);
    this.selectedEventId.set(this.state().events[0]?.id ?? null);
    this.troopForm.reset({ levels: ['Junior'] });
  }

  addGirl(): void {
    if (this.girlForm.invalid) {
      this.girlForm.markAllAsTouched();
      return;
    }

    const form = this.girlForm.getRawValue();
    this.troopData.addGirl({
      firstName: form.firstName,
      lastName: form.lastName,
      level: form.level,
      schoolGrade: form.schoolGrade,
      notes: form.notes,
      parent: {
        name: form.parentName,
        relationship: form.parentRelationship,
        phone: form.parentPhone,
        email: form.parentEmail,
        authorizedPickup: true
      },
      guardians: this.guardiansFromForm(
        form.parentName,
        form.parentRelationship,
        form.parentPhone,
        form.parentEmail,
        form.additionalGuardians
      ),
      authorizedPickupNames: this.pickupNamesFromForm(form.parentName, form.authorizedPickupNames)
    });
    this.girlForm.reset({ level: 'Junior', parentRelationship: 'Parent' });
    this.showAddGirlForm.set(false);
  }

  startEditGirl(girl: Girl): void {
    this.editingGirlId.set(girl.id);
    this.selectedGirlId.set(null);
    this.editGirlForm.reset({
      firstName: girl.firstName,
      lastName: girl.lastName,
      level: girl.level,
      schoolGrade: girl.schoolGrade,
      notes: girl.notes,
      parentName: girl.parent.name,
      parentRelationship: girl.parent.relationship,
      parentPhone: girl.parent.phone,
      parentEmail: girl.parent.email,
      additionalGuardians: girl.guardians
        .filter((guardian) => guardian.email !== girl.parent.email || guardian.name !== girl.parent.name)
        .map((guardian) => this.guardianLine(guardian))
        .join('\n'),
      authorizedPickupNames: girl.authorizedPickupNames.join('\n')
    });
  }

  cancelEditGirl(): void {
    this.editingGirlId.set(null);
    this.editGirlForm.reset({ level: 'Junior', parentRelationship: 'Parent' });
  }

  showGirlProgress(girl: Girl): void {
    this.selectedGirlId.set(girl.id);
    this.editingGirlId.set(null);
    this.badgeProgressSegment.set('all');
  }

  closeGirlProgress(): void {
    this.selectedGirlId.set(null);
  }

  saveGirlEdit(): void {
    const girlId = this.editingGirlId();
    if (!girlId) {
      return;
    }

    if (this.editGirlForm.invalid) {
      this.editGirlForm.markAllAsTouched();
      return;
    }

    const form = this.editGirlForm.getRawValue();
    this.troopData.updateGirl(girlId, {
      firstName: form.firstName,
      lastName: form.lastName,
      level: form.level,
      schoolGrade: form.schoolGrade,
      notes: form.notes,
      parent: {
        name: form.parentName,
        relationship: form.parentRelationship,
        phone: form.parentPhone,
        email: form.parentEmail,
        authorizedPickup: true
      },
      guardians: this.guardiansFromForm(
        form.parentName,
        form.parentRelationship,
        form.parentPhone,
        form.parentEmail,
        form.additionalGuardians
      ),
      authorizedPickupNames: this.pickupNamesFromForm(form.parentName, form.authorizedPickupNames)
    });
    this.cancelEditGirl();
  }

  addEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const form = this.eventForm.getRawValue();
    this.troopData.addEvent(form);
    this.selectedEventId.set(this.state().events.at(-1)?.id ?? null);
    this.eventForm.reset({
      date: new Date().toISOString().slice(0, 10),
      startTime: '18:00',
      badgeIds: []
    });
    this.showAddEventForm.set(false);
  }

  startEditEvent(event: TroopEvent): void {
    this.selectEvent(event);
    this.editingEventId.set(event.id);
    this.editEventForm.reset({
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      location: event.location,
      agenda: event.agenda,
      badgeIds: event.badgeIds
    });
  }

  saveEventEdit(): void {
    const eventId = this.editingEventId();
    if (!eventId) {
      return;
    }

    if (this.editEventForm.invalid) {
      this.editEventForm.markAllAsTouched();
      return;
    }

    this.troopData.updateEventDetails(eventId, this.editEventForm.getRawValue());
    const updatedEvent = this.state().events.find((event) => event.id === eventId);
    if (updatedEvent && this.shouldApplyCompletedEventChanges(updatedEvent)) {
      this.completeEvent(updatedEvent);
    }
  }

  cancelEventEdit(): void {
    this.editingEventId.set(null);
    this.editEventForm.reset({ badgeIds: [] });
  }

  addBadge(): void {
    if (this.badgeForm.invalid) {
      this.badgeForm.markAllAsTouched();
      return;
    }

    const form = this.badgeForm.getRawValue();
    const requirements = form.requirements
      .split('\n')
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title) => ({ id: '', title }));

    this.troopData.addBadge({
      title: form.title,
      level: form.level,
      topic: form.topic || 'Custom',
      sourceUrl: this.badgeSourceUrl,
      requirements
    });
    this.badgeForm.reset({ level: 'Junior' });
    this.showAddBadgeForm.set(false);
  }

  startEditBadge(badge: Badge): void {
    this.editingBadgeId.set(badge.id);
    this.editBadgeForm.reset({
      title: badge.title,
      level: badge.level,
      topic: badge.topic,
      requirements: badge.requirements.map((requirement) => requirement.title).join('\n')
    });
  }

  cancelBadgeEdit(): void {
    this.editingBadgeId.set(null);
    this.editBadgeForm.reset({ level: 'Junior' });
  }

  saveBadgeEdit(): void {
    const badgeId = this.editingBadgeId();
    if (!badgeId) {
      return;
    }

    if (this.editBadgeForm.invalid) {
      this.editBadgeForm.markAllAsTouched();
      return;
    }

    const form = this.editBadgeForm.getRawValue();
    const existingBadge = this.state().badges.find((badge) => badge.id === badgeId);
    const existingRequirements = existingBadge?.requirements ?? [];
    const requirements = form.requirements
      .split('\n')
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title, index) => ({
        id: existingRequirements[index]?.title === title ? existingRequirements[index].id : '',
        title
      }));

    this.troopData.updateBadge(badgeId, {
      title: form.title,
      level: form.level,
      topic: form.topic || 'Custom',
      sourceUrl: existingBadge?.sourceUrl ?? this.badgeSourceUrl,
      requirements
    });
    this.cancelBadgeEdit();
  }

  awardBadge(): void {
    if (this.badgeAwardForm.invalid) {
      this.badgeAwardForm.markAllAsTouched();
      return;
    }

    const form = this.badgeAwardForm.getRawValue();
    this.troopData.awardBadge(form.girlId, form.badgeId, form.awardedAt, form.note);
    this.badgeAwardForm.reset({ awardedAt: new Date().toISOString().slice(0, 10) });
  }

  markBadgeGiven(girlId: string, badgeId: string): void {
    if (this.badgeGivenForm.invalid) {
      this.badgeGivenForm.markAllAsTouched();
      return;
    }

    this.troopData.awardBadge(girlId, badgeId, this.badgeGivenForm.getRawValue().givenAt, 'Badge given to Girl Scout.');
  }

  markOutstandingBadgesGiven(girl: Girl): void {
    if (this.badgeGivenForm.invalid) {
      this.badgeGivenForm.markAllAsTouched();
      return;
    }

    this.outstandingCompletedBadgesForGirl(girl).forEach((progress) => {
      this.troopData.awardBadge(
        girl.id,
        progress.badge.id,
        this.badgeGivenForm.getRawValue().givenAt,
        'Outstanding completed badge given to Girl Scout.'
      );
    });
  }

  completeRequirementForGirl(girl: Girl, requirementId: string): void {
    this.troopData.completeRequirementForGirl(girl.id, requirementId);
  }

  isRequirementCompleteForGirl(girl: Girl, requirementId: string): boolean {
    return this.completedRequirementIdsForGirl(girl.id).has(requirementId);
  }

  selectEvent(event: TroopEvent): void {
    this.selectedEventId.set(event.id);
    this.eventCompleteMessage.set('');
  }

  toggleAttendance(eventId: string, girlId: string): void {
    this.troopData.toggleAttendance(eventId, girlId);
  }

  markAttended(event: TroopEvent, girl: Girl): void {
    this.troopData.markAttended(event.id, girl.id);
    const updatedEvent = this.state().events.find((item) => item.id === event.id);
    if (updatedEvent && this.shouldApplyCompletedEventChanges(updatedEvent)) {
      this.completeEvent(updatedEvent);
    }
  }

  toggleRequirement(eventId: string, girlId: string, requirementId: string): void {
    this.troopData.toggleRequirement(eventId, girlId, requirementId);
  }

  toggleMeetingRequirement(eventId: string, requirementId: string): void {
    this.troopData.toggleMeetingRequirement(eventId, requirementId);
    this.eventCompleteMessage.set('');
    const updatedEvent = this.state().events.find((event) => event.id === eventId);
    if (updatedEvent && this.shouldApplyCompletedEventChanges(updatedEvent)) {
      this.completeEvent(updatedEvent);
    }
  }

  completeEvent(event: TroopEvent): void {
    const result = this.troopData.completeEvent(event.id);
    this.eventCompleteMessage.set(
      result.associationsCreated === 0
        ? 'Event marked complete. No new requirement credits were needed.'
        : `Event marked complete. Added ${result.associationsCreated} requirement credit${result.associationsCreated === 1 ? '' : 's'} for ${result.girlsUpdated} attendee${result.girlsUpdated === 1 ? '' : 's'}.`
    );
  }

  async promptDropOff(event: TroopEvent, girl: Girl): Promise<void> {
    const alert = await this.alertController.create({
      header: `Drop off ${girl.firstName}`,
      inputs: [
        {
          name: 'guardianName',
          placeholder: 'Who dropped her off?',
          type: 'text',
          value: girl.parent.name
        }
      ],
      buttons: [
        {
          role: 'cancel',
          text: 'Cancel'
        },
        {
          handler: (value: { guardianName?: string }) => {
            const guardianName = value.guardianName?.trim();
            if (!guardianName) {
              return false;
            }

            this.troopData.recordDropOff(event.id, girl.id, guardianName);
            return true;
          },
          text: 'Save'
        }
      ]
    });

    await alert.present();
  }

  async promptPickUp(event: TroopEvent, girl: Girl): Promise<void> {
    const alert = await this.alertController.create({
      header: `Pick up ${girl.firstName}`,
      message: `Authorized pickup: ${girl.authorizedPickupNames.join(', ') || 'Not listed'}`,
      inputs: [
        {
          name: 'guardianName',
          placeholder: 'Who picked her up?',
          type: 'text',
          value: girl.parent.name
        }
      ],
      buttons: [
        {
          role: 'cancel',
          text: 'Cancel'
        },
        {
          handler: (value: { guardianName?: string }) => {
            const guardianName = value.guardianName?.trim();
            if (!guardianName) {
              return false;
            }

            this.troopData.recordPickUp(event.id, girl.id, guardianName);
            return true;
          },
          text: 'Save'
        }
      ]
    });

    await alert.present();
  }

  recordRsvp(event: TroopEvent, girlId: string, status: RsvpStatus): void {
    this.troopData.recordRsvp(event.id, girlId, status, this.rsvpForm.getRawValue().note);
    this.rsvpForm.reset();
  }

  prepareReminderDrafts(): void {
    if (this.reminderForm.invalid) {
      this.reminderForm.markAllAsTouched();
      return;
    }

    const count = this.troopData.prepareReminderDrafts(this.reminderForm.getRawValue().daysBefore);
    this.updateMessage.set(`${count} reminder draft${count === 1 ? '' : 's'} prepared. No emails were sent.`);
  }

  rsvpLabel(event: TroopEvent, girlId: string): string {
    const rsvp = event.rsvps[girlId];
    if (!rsvp) {
      return 'No RSVP yet';
    }

    return `${rsvp.status.toUpperCase()} · ${this.formatDateTime(rsvp.respondedAt)}`;
  }

  awardedBadgesForGirl(girlId: string): Array<{ title: string; awardedAt: string; note: string }> {
    return (this.state().badgeAwards[girlId] ?? []).map((award) => {
      const badge = this.state().badges.find((item) => item.id === award.badgeId);
      return {
        title: badge?.title ?? 'Unknown badge',
        awardedAt: award.awardedAt,
        note: award.note
      };
    });
  }

  badgeProgressForGirl(girl: Girl): GirlBadgeProgress[] {
    const completedRequirementIds = this.completedRequirementIdsForGirl(girl.id);
    const awardedBadges = this.state().badgeAwards[girl.id] ?? [];

    return this.state().badges
      .filter((badge) => badge.level === girl.level)
      .map((badge) => {
        const completedRequirements = badge.requirements.filter((requirement) =>
          completedRequirementIds.has(requirement.id)
        );
        const awardedBadge = awardedBadges.find((award) => award.badgeId === badge.id);
        const completedCount = completedRequirements.length;
        const totalRequirements = badge.requirements.length;

        return {
          badge,
          completedRequirements,
          remainingRequirements: badge.requirements.filter((requirement) => !completedRequirementIds.has(requirement.id)),
          totalRequirements,
          completedCount,
          status:
            completedCount === totalRequirements && totalRequirements > 0
              ? 'complete'
              : completedCount > 0
                ? 'partial'
                : 'not-started',
          awardedAt: awardedBadge?.awardedAt ?? null
        };
      });
  }

  outstandingCompletedBadgesForGirl(girl: Girl): GirlBadgeProgress[] {
    return this.badgeProgressForGirl(girl).filter((progress) => progress.status === 'complete' && !progress.awardedAt);
  }

  visibleBadgeProgressForGirl(girl: Girl): GirlBadgeProgress[] {
    const progressItems = this.badgeProgressForGirl(girl);

    if (this.badgeProgressSegment() === 'completed') {
      return progressItems.filter((progress) => progress.status === 'complete');
    }

    if (this.badgeProgressSegment() === 'started') {
      return progressItems.filter((progress) => progress.status === 'partial');
    }

    return progressItems;
  }

  private guardiansFromForm(
    parentName: string,
    parentRelationship: string,
    parentPhone: string,
    parentEmail: string,
    additionalGuardians: string
  ): ParentContact[] {
    const primaryGuardian: ParentContact = {
      name: parentName,
      relationship: parentRelationship,
      phone: parentPhone,
      email: parentEmail,
      authorizedPickup: true
    };
    const additional = additionalGuardians
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = '', relationship = 'Guardian', phone = '', email = '', pickup = 'yes'] = line
          .split('|')
          .map((part) => part.trim());

        return {
          name,
          relationship,
          phone,
          email,
          authorizedPickup: pickup.toLowerCase() !== 'no'
        };
      })
      .filter((guardian) => Boolean(guardian.name));

    return [primaryGuardian, ...additional];
  }

  private pickupNamesFromForm(primaryName: string, authorizedPickupNames: string): string[] {
    const names = authorizedPickupNames
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean);

    return Array.from(new Set([primaryName, ...names].filter(Boolean)));
  }

  private guardianLine(guardian: ParentContact): string {
    return [
      guardian.name,
      guardian.relationship,
      guardian.phone,
      guardian.email,
      guardian.authorizedPickup ? 'yes' : 'no'
    ].join(' | ');
  }

  private completedRequirementIdsForGirl(girlId: string): Set<string> {
    return this.state().events.reduce((requirementIds, event) => {
      Object.entries(event.completions[girlId] ?? {}).forEach(([requirementId, completed]) => {
        if (completed) {
          requirementIds.add(requirementId);
        }
      });
      return requirementIds;
    }, new Set<string>(Object.keys(this.state().manualCompletions[girlId] ?? {})));
  }

  isRequirementComplete(event: TroopEvent, girlId: string, requirementId: string): boolean {
    return event.completions[girlId]?.[requirementId] ?? false;
  }

  isMeetingRequirementComplete(event: TroopEvent, requirementId: string): boolean {
    return event.requirementWork[requirementId] ?? false;
  }

  isSelectedEvent(event: TroopEvent): boolean {
    return this.selectedEvent()?.id === event.id;
  }

  isSelectedTroop(troopId: string): boolean {
    return this.currentTroopId() === troopId;
  }

  resetDemoData(): void {
    this.troopData.resetDemoData();
    this.authMessage.set('Demo data reset. Sign in with leader@example.com and troop123.');
    this.selectedEventId.set(this.state().events[0]?.id ?? null);
  }

  completionCount(event: TroopEvent, girlId: string): number {
    const girl = this.state().girls.find((item) => item.id === girlId);
    if (!girl || !event.attendance[girlId]) {
      return 0;
    }

    return this.selectedEventBadges().reduce((total, badge) => {
      if (badge.level !== girl.level) {
        return total;
      }

      return (
        total +
        badge.requirements.filter((requirement) =>
          event.completedAt ? event.completions[girlId]?.[requirement.id] : event.requirementWork[requirement.id]
        ).length
      );
    }, 0);
  }

  attendedGirlsForBadgeLevel(event: TroopEvent, level: ScoutLevel): number {
    return this.state().girls.filter((girl) => girl.level === level && event.attendance[girl.id]).length;
  }

  shouldApplyCompletedEventChanges(event: TroopEvent): boolean {
    const eventDate = new Date(`${event.date}T${event.startTime || '00:00'}`);
    const now = new Date();
    return Boolean(event.completedAt) || eventDate < now;
  }

  checkInStatus(event: TroopEvent, girlId: string): string {
    const checkIn = event.checkIns[girlId];
    if (checkIn?.pickedUpAt) {
      return `Picked up ${this.formatTime(checkIn.pickedUpAt)} by ${checkIn.pickedUpBy}`;
    }

    if (checkIn?.droppedOffAt) {
      return `Dropped off ${this.formatTime(checkIn.droppedOffAt)} by ${checkIn.droppedOffBy}`;
    }

    return 'Not dropped off';
  }

  isOnSite(event: TroopEvent, girlId: string): boolean {
    const checkIn = event.checkIns[girlId];
    return Boolean(checkIn?.droppedOffAt && !checkIn.pickedUpAt);
  }

  isPickedUp(event: TroopEvent, girlId: string): boolean {
    return Boolean(event.checkIns[girlId]?.pickedUpAt);
  }

  formatTime(value: string | null): string {
    if (!value) {
      return 'Not recorded';
    }

    return new Intl.DateTimeFormat([], {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return 'Not recorded';
    }

    return new Intl.DateTimeFormat([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }

  totalRequirementsForEvent(event: TroopEvent): number {
    return event.badgeIds.reduce((total, badgeId) => {
      const badge = this.state().badges.find((item) => item.id === badgeId);
      return total + (badge?.requirements.length ?? 0);
    }, 0);
  }
}
