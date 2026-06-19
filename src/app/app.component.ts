import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  medalOutline,
  peopleOutline,
  personAddOutline,
  refreshOutline,
  ribbonOutline,
  saveOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import {
  Account,
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
type ParentSegment = 'events' | 'badges' | 'girls';

const scoutLevels: ScoutLevel[] = ['Daisy', 'Brownie', 'Junior', 'Cadette', 'Senior', 'Ambassador'];
const gradeOptions = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const calendarWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const phonePattern = /^$|^\s*(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\s*$/;

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
  readonly visibleAccounts = this.troopData.visibleAccounts;
  readonly pendingAccounts = this.troopData.pendingAccounts;
  readonly levels = scoutLevels;
  readonly gradeOptions = gradeOptions;
  readonly calendarWeekdays = calendarWeekdays;
  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly selectedEventId = signal<string | null>(null);
  readonly selectedSegment = signal<'dashboard' | 'girls' | 'schedule' | 'badges' | 'toBuy' | 'troops'>('dashboard');
  readonly authMode = signal<'login' | 'register'>('login');
  readonly authMessage = signal('');
  readonly updateMessage = signal('');
  readonly eventCompleteMessage = signal('');
  readonly showAddAttendeeList = signal(false);
  readonly selectedCalendarDate = signal(new Date().toISOString().slice(0, 10));
  readonly parentSegment = signal<ParentSegment>('events');
  readonly activeGirlEditor = signal<'create' | 'edit' | null>(null);
  readonly parentGirlInfoEditorOpen = signal(false);
  readonly activeEventEditor = signal<'create' | 'edit' | null>(null);
  readonly badgeAwardEditorOpen = signal(false);
  readonly parentGirlEditorOpen = signal(false);
  readonly editingParentAccountId = signal<string | null>(null);
  readonly editingGirlId = signal<string | null>(null);
  readonly editingParentGirlId = signal<string | null>(null);
  readonly selectedGirlId = signal<string | null>(null);
  readonly editingEventId = signal<string | null>(null);
  readonly editingBadgeId = signal<string | null>(null);
  readonly activeBadgeEditor = signal<'create' | 'edit' | null>(null);
  readonly badgeProgressSegment = signal<BadgeProgressSegment>('all');
  readonly girlLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly badgeLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly badgeCatalogLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly eventBadgeSearch = signal('');
  readonly eventBadgePickerLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly activeEventBadgePicker = signal<'create' | 'edit' | 'award' | null>(null);
  readonly pendingEventBadgeIds = signal<string[]>([]);
  readonly badgeAwardGirlPickerOpen = signal(false);
  readonly badgeAwardGirlSearch = signal('');
  readonly badgeAwardGirlLevelFilter = signal<ScoutLevel | 'All'>('All');
  readonly pendingBadgeAwardGirlId = signal('');
  readonly badgeSourceUrl = 'https://www.girlscouts.org/en/members/for-girl-scouts/badges-journeys-awards/badge-explorer.html';

  readonly visibleEvents = computed(() => {
    const account = this.currentAccount();
    return this.state().events.filter((event) => account?.role !== 'parent' || !event.adminOnly);
  });

  readonly upcomingEvents = computed(() =>
    [...this.visibleEvents()].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
  );

  readonly parentUpcomingEvents = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.upcomingEvents().filter((event) => new Date(`${event.date}T${event.startTime || '00:00'}`) >= today);
  });

  readonly nextVisibleEvent = computed(() => this.parentUpcomingEvents()[0] ?? this.upcomingEvents()[0] ?? null);
  readonly parentHeroTitle = computed(() => 'Family dashboard');

  readonly selectedEvent = computed(() => {
    const selectedId = this.selectedEventId();
    return this.visibleEvents().find((event) => event.id === selectedId) ?? this.nextVisibleEvent();
  });

  readonly calendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat([], { month: 'long', year: 'numeric' }).format(this.calendarMonth())
  );

  readonly calendarDays = computed(() => {
    const month = this.calendarMonth();
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const days: Array<{ date: string; day: number; eventCount: number; adminOnlyCount: number } | null> = [];

    for (let blank = 0; blank < firstDay.getDay(); blank += 1) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        day,
        eventCount: this.visibleEvents().filter((event) => event.date === date).length,
        adminOnlyCount: this.visibleEvents().filter((event) => event.date === date && event.adminOnly).length
      });
    }

    return days;
  });

  readonly selectedCalendarEvents = computed(() =>
    this.visibleEvents()
      .filter((event) => event.date === this.selectedCalendarDate())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  );

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
  readonly currentTroopLevels = computed(() => {
    const troopLevels = this.currentTroop()?.levels ?? [];
    return troopLevels.length > 0 ? troopLevels : this.levels;
  });

  readonly troopBadges = computed(() => {
    const troopLevels = this.currentTroop()?.levels ?? [];
    return this.state().badges.filter((badge) => troopLevels.length === 0 || troopLevels.includes(badge.level));
  });

  readonly filteredTroopBadges = computed(() =>
    this.troopBadges().filter((badge) => this.badgeCatalogLevelFilter() === 'All' || badge.level === this.badgeCatalogLevelFilter())
  );

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
      const matchesLevel = this.eventBadgePickerLevelFilter() === 'All' || badge.level === this.eventBadgePickerLevelFilter();
      const matchesSearch =
        !search ||
        badge.title.toLowerCase().includes(search) ||
        badge.topic.toLowerCase().includes(search) ||
        badge.level.toLowerCase().includes(search);

      return matchesLevel && matchesSearch;
    });
  });

  readonly badgeAwardGirlOptions = computed(() => {
    const search = this.badgeAwardGirlSearch().trim().toLowerCase();

    return this.state().girls.filter((girl) => {
      const matchesLevel = this.badgeAwardGirlLevelFilter() === 'All' || girl.level === this.badgeAwardGirlLevelFilter();
      const fullName = `${girl.firstName} ${girl.lastName}`.toLowerCase();
      return matchesLevel && (!search || fullName.includes(search) || girl.level.toLowerCase().includes(search));
    });
  });

  readonly eventBadgePickerOpen = computed(() => this.activeEventBadgePicker() !== null);
  readonly badgeEditorOpen = computed(() => this.activeBadgeEditor() !== null);
  readonly girlEditorOpen = computed(() => this.activeGirlEditor() !== null);
  readonly eventEditorOpen = computed(() => this.activeEventEditor() !== null);
  readonly parentAccounts = computed(() => {
    const troopId = this.currentTroopId();
    return this.visibleAccounts().filter(
      (account) => account.role === 'parent' && (!troopId || account.troopIds.includes(troopId))
    );
  });
  readonly badgePurchaseSummary = computed(() =>
    this.state()
      .girls.flatMap((girl) =>
        this.outstandingCompletedBadgesForGirl(girl).map((progress) => ({
          girl,
          badge: progress.badge
        }))
      )
      .sort((a, b) => a.badge.title.localeCompare(b.badge.title) || a.girl.firstName.localeCompare(b.girl.firstName))
  );

  readonly girlForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    level: ['Junior' as ScoutLevel, Validators.required],
    schoolGrade: ['', Validators.required],
    goalsForYear: [''],
    notes: [''],
    parentAccountIds: [[] as string[]],
    parentName: [''],
    parentRelationship: ['Parent'],
    parentPhone: ['', Validators.pattern(phonePattern)],
    parentEmail: ['', Validators.email],
    additionalGuardians: [''],
    authorizedPickupNames: ['']
  });

  readonly editGirlForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    level: ['Junior' as ScoutLevel, Validators.required],
    schoolGrade: ['', Validators.required],
    goalsForYear: [''],
    notes: [''],
    parentAccountIds: [[] as string[]],
    parentName: [''],
    parentRelationship: ['Parent'],
    parentPhone: ['', Validators.pattern(phonePattern)],
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
    evidenceNotes: [''],
    evidencePhotos: [''],
    adminOnly: [false],
    badgeIds: [[] as string[]]
  });

  readonly editEventForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    location: [''],
    agenda: [''],
    evidenceNotes: [''],
    evidencePhotos: [''],
    adminOnly: [false],
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
    confirmPassword: [''],
    troopId: ['troop-1001']
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

  readonly parentGirlAssociationForm = this.fb.nonNullable.group({
    girlIds: [[] as string[]]
  });

  readonly parentGirlForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    schoolGrade: ['', Validators.required],
    goalsForYear: [''],
    notes: [''],
    authorizedPickupNames: ['']
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
      medalOutline,
      peopleOutline,
      personAddOutline,
      refreshOutline,
      ribbonOutline,
      saveOutline,
      shieldCheckmarkOutline
    });
    const nextEvent = this.nextVisibleEvent();
    if (nextEvent) {
      this.selectedCalendarDate.set(nextEvent.date);
    }
    if (this.isSystemAdmin()) {
      this.selectedSegment.set('troops');
    }
  }

  async submitAuth(): Promise<void> {
    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }

    const form = this.authForm.getRawValue();
    if (this.authMode() === 'register' && (!form.name.trim() || !form.troopId)) {
      this.authMessage.set('Enter your name and choose a troop.');
      return;
    }

    if (this.authMode() === 'register' && form.password !== form.confirmPassword) {
      this.authMessage.set('Passwords must match.');
      return;
    }

    const result = await (
      this.authMode() === 'login'
        ? this.troopData.login(form.email, form.password)
        : this.troopData.registerAccount(form.name, form.email, form.password, form.troopId)
    );

    this.authMessage.set(result.message);
    if (result.ok && this.authMode() === 'login') {
      const nextEvent = this.nextVisibleEvent();
      this.selectedEventId.set(nextEvent?.id ?? null);
      if (nextEvent) {
        this.selectedCalendarDate.set(nextEvent.date);
        this.calendarMonth.set(new Date(`${nextEvent.date}T00:00:00`));
      }
      this.selectedSegment.set(this.isSystemAdmin() ? 'troops' : 'dashboard');
    }
  }

  logout(): void {
    this.troopData.logout();
    this.authMessage.set('');
    this.selectedSegment.set('dashboard');
  }

  setSelectedSegment(segment: 'dashboard' | 'girls' | 'schedule' | 'badges' | 'toBuy' | 'troops'): void {
    this.selectedSegment.set(segment);
    this.editingEventId.set(null);
    this.editingGirlId.set(null);
    this.activeEventEditor.set(null);
    this.activeGirlEditor.set(null);
    this.editEventForm.reset({ badgeIds: [] });
    this.editingBadgeId.set(null);
  }

  switchTroop(troopId: string): void {
    this.troopData.switchTroop(troopId);
    const nextEvent = this.nextVisibleEvent();
    this.selectedEventId.set(nextEvent?.id ?? null);
    if (nextEvent) {
      this.selectedCalendarDate.set(nextEvent.date);
      this.calendarMonth.set(new Date(`${nextEvent.date}T00:00:00`));
    }
  }

  changeCalendarMonth(offset: number): void {
    const current = this.calendarMonth();
    this.calendarMonth.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  selectCalendarDate(date: string): void {
    this.selectedCalendarDate.set(date);
  }

  isSystemAdmin(): boolean {
    return this.currentAccount()?.role === 'system-admin';
  }

  isTroopAdmin(): boolean {
    return this.currentAccount()?.role === 'troop-admin';
  }

  approveAccount(accountId: string): void {
    this.troopData.approveAccount(accountId);
  }

  inactivateAccount(accountId: string): void {
    this.troopData.setAccountStatus(accountId, 'inactive');
  }

  activateAccount(accountId: string): void {
    this.troopData.setAccountStatus(accountId, 'active');
  }

  accountStatusLabel(account: Account): string {
    return account.status === 'inactive' ? 'disabled' : account.status;
  }

  parentGirlNames(account: Account): string {
    const names = this.state()
      .girls.filter((girl) => account.girlIds.includes(girl.id))
      .map((girl) => `${girl.firstName} ${girl.lastName}`);

    return names.length > 0 ? names.join(', ') : 'No girls assigned';
  }

  parentAccountIdsForGirl(girl: Girl): string[] {
    return this.parentAccounts()
      .filter((account) => account.girlIds.includes(girl.id))
      .map((account) => account.id);
  }

  openParentGirlInfoEditor(girl: Girl): void {
    if (!this.parentGirls().some((parentGirl) => parentGirl.id === girl.id)) {
      return;
    }

    this.editingParentGirlId.set(girl.id);
    this.parentGirlForm.reset({
      firstName: girl.firstName,
      lastName: girl.lastName,
      schoolGrade: girl.schoolGrade,
      goalsForYear: girl.goalsForYear,
      notes: girl.notes,
      authorizedPickupNames: girl.authorizedPickupNames.join('\n')
    });
    this.parentGirlInfoEditorOpen.set(true);
  }

  closeParentGirlInfoEditor(): void {
    this.parentGirlInfoEditorOpen.set(false);
    this.editingParentGirlId.set(null);
    this.parentGirlForm.reset();
  }

  saveParentGirlInfo(): void {
    const girlId = this.editingParentGirlId();
    if (!girlId || !this.parentGirls().some((girl) => girl.id === girlId)) {
      return;
    }

    if (this.parentGirlForm.invalid) {
      this.parentGirlForm.markAllAsTouched();
      return;
    }

    const form = this.parentGirlForm.getRawValue();
    this.troopData.updateGirlDetails(girlId, {
      firstName: form.firstName,
      lastName: form.lastName,
      schoolGrade: form.schoolGrade,
      goalsForYear: form.goalsForYear,
      notes: form.notes,
      authorizedPickupNames: this.linesFromText(form.authorizedPickupNames)
    });
    this.closeParentGirlInfoEditor();
  }

  openParentGirlEditor(account: Account): void {
    if (account.role !== 'parent' || (!this.isSystemAdmin() && !this.isTroopAdmin())) {
      return;
    }

    this.editingParentAccountId.set(account.id);
    this.parentGirlAssociationForm.reset({ girlIds: account.girlIds });
    this.parentGirlEditorOpen.set(true);
  }

  closeParentGirlEditor(): void {
    this.parentGirlEditorOpen.set(false);
    this.editingParentAccountId.set(null);
    this.parentGirlAssociationForm.reset({ girlIds: [] });
  }

  saveParentGirlAssociations(): void {
    const accountId = this.editingParentAccountId();
    if (!accountId) {
      return;
    }

    this.troopData.updateParentGirlAssociations(accountId, this.parentGirlAssociationForm.getRawValue().girlIds);
    this.closeParentGirlEditor();
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
    const parentContacts = this.parentContactsFromForm(form.parentAccountIds, form.additionalGuardians);
    const primaryParent = parentContacts[0] ?? this.emptyParentContact();
    const newGirlId = this.troopData.addGirl({
      firstName: form.firstName,
      lastName: form.lastName,
      level: form.level,
      schoolGrade: form.schoolGrade,
      goalsForYear: form.goalsForYear,
      notes: form.notes,
      parent: primaryParent,
      guardians: parentContacts,
      authorizedPickupNames: this.pickupNamesFromContacts(parentContacts, form.authorizedPickupNames)
    });
    if (newGirlId) {
      this.troopData.setGirlParentAccounts(newGirlId, form.parentAccountIds);
    }
    this.girlForm.reset({ level: 'Junior', parentRelationship: 'Parent', parentAccountIds: [] });
    this.closeGirlEditor();
  }

  openAddGirlModal(): void {
    this.editingGirlId.set(null);
    this.girlForm.reset({ level: 'Junior', parentRelationship: 'Parent', parentAccountIds: [] });
    this.activeGirlEditor.set('create');
  }

  startEditGirl(girl: Girl): void {
    this.editingGirlId.set(girl.id);
    this.selectedGirlId.set(null);
    this.editGirlForm.reset({
      firstName: girl.firstName,
      lastName: girl.lastName,
      level: girl.level,
      schoolGrade: girl.schoolGrade,
      goalsForYear: girl.goalsForYear,
      notes: girl.notes,
      parentAccountIds: this.parentAccountIdsForGirl(girl),
      parentName: girl.parent.name,
      parentRelationship: girl.parent.relationship,
      parentPhone: girl.parent.phone,
      parentEmail: girl.parent.email,
      additionalGuardians: girl.guardians
        .filter((guardian) => !this.parentAccounts().some((account) => account.email.toLowerCase() === guardian.email.toLowerCase()))
        .map((guardian) => this.guardianLine(guardian))
        .join('\n'),
      authorizedPickupNames: girl.authorizedPickupNames.join('\n')
    });
    this.activeGirlEditor.set('edit');
  }

  cancelEditGirl(): void {
    this.editingGirlId.set(null);
    this.editGirlForm.reset({ level: 'Junior', parentRelationship: 'Parent' });
  }

  closeGirlEditor(): void {
    this.activeGirlEditor.set(null);
    this.editingGirlId.set(null);
    this.girlForm.reset({ level: 'Junior', parentRelationship: 'Parent', parentAccountIds: [] });
    this.editGirlForm.reset({ level: 'Junior', parentRelationship: 'Parent', parentAccountIds: [] });
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
    const parentContacts = this.parentContactsFromForm(form.parentAccountIds, form.additionalGuardians);
    const primaryParent = parentContacts[0] ?? this.emptyParentContact();
    this.troopData.updateGirl(girlId, {
      firstName: form.firstName,
      lastName: form.lastName,
      level: form.level,
      schoolGrade: form.schoolGrade,
      goalsForYear: form.goalsForYear,
      notes: form.notes,
      parent: primaryParent,
      guardians: parentContacts,
      authorizedPickupNames: this.pickupNamesFromContacts(parentContacts, form.authorizedPickupNames)
    });
    this.troopData.setGirlParentAccounts(girlId, form.parentAccountIds);
    this.closeGirlEditor();
  }

  addEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    const form = this.eventForm.getRawValue();
    this.troopData.addEvent({
      ...form,
      evidencePhotos: this.linesFromText(form.evidencePhotos)
    });
    this.selectedEventId.set(this.state().events.at(-1)?.id ?? null);
    this.eventForm.reset({
      date: new Date().toISOString().slice(0, 10),
      startTime: '18:00',
      adminOnly: false,
      badgeIds: []
    });
    this.closeEventEditor();
  }

  openAddEventModal(): void {
    this.editingEventId.set(null);
    this.eventForm.reset({
      date: new Date().toISOString().slice(0, 10),
      startTime: '18:00',
      adminOnly: false,
      badgeIds: []
    });
    this.activeEventEditor.set('create');
  }

  startEditEvent(event: TroopEvent): void {
    this.selectEvent(event);
    this.editingEventId.set(event.id);
    this.showAddAttendeeList.set(false);
    this.editEventForm.reset({
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      location: event.location,
      agenda: event.agenda,
      evidenceNotes: event.evidenceNotes,
      evidencePhotos: event.evidencePhotos.join('\n'),
      adminOnly: event.adminOnly,
      badgeIds: event.badgeIds
    });
    this.activeEventEditor.set('edit');
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

    const form = this.editEventForm.getRawValue();
    this.troopData.updateEventDetails(eventId, {
      ...form,
      evidencePhotos: this.linesFromText(form.evidencePhotos)
    });
    const updatedEvent = this.state().events.find((event) => event.id === eventId);
    if (updatedEvent && this.shouldApplyCompletedEventChanges(updatedEvent)) {
      this.completeEvent(updatedEvent);
    }
    this.closeEventEditor();
  }

  cancelEventEdit(): void {
    this.editingEventId.set(null);
    this.showAddAttendeeList.set(false);
    this.editEventForm.reset({ badgeIds: [] });
  }

  closeEventEditor(): void {
    this.activeEventEditor.set(null);
    this.editingEventId.set(null);
    this.showAddAttendeeList.set(false);
    this.eventForm.reset({
      date: new Date().toISOString().slice(0, 10),
      startTime: '18:00',
      adminOnly: false,
      badgeIds: []
    });
    this.editEventForm.reset({ badgeIds: [] });
  }

  addBadge(): void {
    if (!this.isSystemAdmin()) {
      return;
    }

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
    this.badgeForm.reset({ level: this.currentTroopLevels()[0] ?? 'Junior' });
    this.closeBadgeEditor();
  }

  openAddBadgeModal(): void {
    if (!this.isSystemAdmin()) {
      return;
    }

    this.editingBadgeId.set(null);
    this.badgeForm.reset({ level: this.currentTroopLevels()[0] ?? 'Junior' });
    this.activeBadgeEditor.set('create');
  }

  startEditBadge(_badge: Badge): void {
    return;
  }

  cancelBadgeEdit(): void {
    this.editingBadgeId.set(null);
    this.editBadgeForm.reset({ level: this.currentTroopLevels()[0] ?? 'Junior' });
  }

  closeBadgeEditor(): void {
    this.activeBadgeEditor.set(null);
    this.editingBadgeId.set(null);
    this.badgeForm.reset({ level: this.currentTroopLevels()[0] ?? 'Junior' });
    this.editBadgeForm.reset({ level: this.currentTroopLevels()[0] ?? 'Junior' });
  }

  saveBadgeEdit(): void {
    this.closeBadgeEditor();
  }

  awardBadge(): void {
    if (this.badgeAwardForm.invalid) {
      this.badgeAwardForm.markAllAsTouched();
      return;
    }

    const form = this.badgeAwardForm.getRawValue();
    this.troopData.creditBadge(form.girlId, form.badgeId);
    this.badgeAwardForm.reset({ awardedAt: new Date().toISOString().slice(0, 10) });
    this.closeBadgeAwardEditor();
  }

  openBadgeAwardEditor(): void {
    this.badgeAwardForm.reset({ awardedAt: new Date().toISOString().slice(0, 10) });
    this.badgeAwardEditorOpen.set(true);
  }

  closeBadgeAwardEditor(): void {
    this.badgeAwardEditorOpen.set(false);
    this.badgeAwardForm.reset({ awardedAt: new Date().toISOString().slice(0, 10) });
    this.closeBadgeAwardGirlPicker();
  }

  openBadgeAwardGirlPicker(): void {
    this.pendingBadgeAwardGirlId.set(this.badgeAwardForm.getRawValue().girlId);
    this.badgeAwardGirlSearch.set('');
    this.badgeAwardGirlLevelFilter.set('All');
    this.badgeAwardGirlPickerOpen.set(true);
  }

  closeBadgeAwardGirlPicker(): void {
    this.badgeAwardGirlPickerOpen.set(false);
    this.pendingBadgeAwardGirlId.set('');
    this.badgeAwardGirlSearch.set('');
    this.badgeAwardGirlLevelFilter.set('All');
  }

  applyBadgeAwardGirlPicker(): void {
    this.badgeAwardForm.get('girlId')?.setValue(this.pendingBadgeAwardGirlId());
    this.badgeAwardForm.get('girlId')?.markAsDirty();
    this.closeBadgeAwardGirlPicker();
  }

  selectedAwardGirlSummary(): string {
    const girlId = this.badgeAwardForm.getRawValue().girlId;
    const girl = this.state().girls.find((candidate) => candidate.id === girlId);
    return girl ? `${girl.firstName} ${girl.lastName} · ${girl.level}` : 'Search for a Girl Scout';
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
    this.showAddAttendeeList.set(false);
    const updatedEvent = this.state().events.find((item) => item.id === event.id);
    if (updatedEvent && this.shouldApplyCompletedEventChanges(updatedEvent)) {
      this.completeEvent(updatedEvent);
    }
  }

  attendedGirls(event: TroopEvent): Girl[] {
    return this.state().girls.filter((girl) => event.attendance[girl.id]);
  }

  availableAttendees(event: TroopEvent): Girl[] {
    return this.state().girls.filter((girl) => !event.attendance[girl.id]);
  }

  isEventBadgeSelected(form: FormGroup, badgeId: string): boolean {
    return ((form.get('badgeIds')?.value ?? []) as string[]).includes(badgeId);
  }

  selectedEventBadgeCount(form: FormGroup): number {
    return ((form.get('badgeIds')?.value ?? []) as string[]).length;
  }

  selectedEventBadgeSummary(form: FormGroup): string {
    const selectedIds = (form.get('badgeIds')?.value ?? []) as string[];
    if (selectedIds.length === 0) {
      return 'No badges selected';
    }

    return selectedIds
      .map((badgeId) => this.state().badges.find((badge) => badge.id === badgeId)?.title)
      .filter(Boolean)
      .slice(0, 2)
      .join(', ') + (selectedIds.length > 2 ? ` +${selectedIds.length - 2} more` : '');
  }

  toggleEventBadge(form: FormGroup, badgeId: string, checked?: boolean): void {
    const control = form.get('badgeIds');
    const current = ((control?.value ?? []) as string[]).filter(Boolean);
    const shouldSelect = checked ?? !current.includes(badgeId);
    const next = shouldSelect
      ? Array.from(new Set([...current, badgeId]))
      : current.filter((id) => id !== badgeId);

    control?.setValue(next);
    control?.markAsDirty();
  }

  openEventBadgePicker(target: 'create' | 'edit' | 'award'): void {
    const selectedBadgeIds = target === 'award'
      ? [this.badgeAwardForm.getRawValue().badgeId].filter(Boolean)
      : [...((target === 'create' ? this.eventForm : this.editEventForm).get('badgeIds')?.value ?? [])];

    this.eventBadgeSearch.set('');
    this.eventBadgePickerLevelFilter.set('All');
    this.pendingEventBadgeIds.set(selectedBadgeIds);
    this.activeEventBadgePicker.set(target);
  }

  closeEventBadgePicker(): void {
    this.activeEventBadgePicker.set(null);
    this.pendingEventBadgeIds.set([]);
    this.eventBadgeSearch.set('');
    this.eventBadgePickerLevelFilter.set('All');
  }

  applyEventBadgePicker(): void {
    const target = this.activeEventBadgePicker();
    if (!target) {
      return;
    }

    if (target === 'award') {
      this.badgeAwardForm.get('badgeId')?.setValue(this.pendingEventBadgeIds()[0] ?? '');
      this.badgeAwardForm.get('badgeId')?.markAsDirty();
      this.closeEventBadgePicker();
      return;
    }

    const form = target === 'create' ? this.eventForm : this.editEventForm;
    form.get('badgeIds')?.setValue(this.pendingEventBadgeIds());
    form.get('badgeIds')?.markAsDirty();
    this.closeEventBadgePicker();
  }

  isPendingEventBadgeSelected(badgeId: string): boolean {
    return this.pendingEventBadgeIds().includes(badgeId);
  }

  togglePendingEventBadge(badgeId: string, checked?: boolean): void {
    if (this.activeEventBadgePicker() === 'award') {
      this.pendingEventBadgeIds.set(checked === false ? [] : [badgeId]);
      return;
    }

    const current = this.pendingEventBadgeIds();
    const shouldSelect = checked ?? !current.includes(badgeId);
    this.pendingEventBadgeIds.set(
      shouldSelect ? Array.from(new Set([...current, badgeId])) : current.filter((id) => id !== badgeId)
    );
  }

  selectedAwardBadgeSummary(): string {
    const badgeId = this.badgeAwardForm.getRawValue().badgeId;
    return this.state().badges.find((badge) => badge.id === badgeId)?.title ?? 'Search for a badge';
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

  rsvpStatusValue(event: TroopEvent, girlId: string): RsvpStatus | '' {
    return event.rsvps[girlId]?.status ?? '';
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

  badgeProgressRows(badge: Badge): Array<{
    girl: Girl;
    completedCount: number;
    totalRequirements: number;
    status: 'Started' | 'Completed';
    awardedAt: string | null;
  }> {
    const totalRequirements = badge.requirements.length;

    return this.state()
      .girls.filter((girl) => girl.level === badge.level)
      .map((girl) => {
        const completedRequirementIds = this.completedRequirementIdsForGirl(girl.id);
        const completedCount = badge.requirements.filter((requirement) => completedRequirementIds.has(requirement.id)).length;
        const awardedAt =
          (this.state().badgeAwards[girl.id] ?? []).find((award) => award.badgeId === badge.id)?.awardedAt ?? null;

        return {
          girl,
          completedCount,
          totalRequirements,
          status: completedCount === totalRequirements && totalRequirements > 0 ? 'Completed' as const : 'Started' as const,
          awardedAt
        };
      })
      .filter((row) => row.completedCount > 0)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'Completed' ? -1 : 1;
        }

        return `${a.girl.firstName} ${a.girl.lastName}`.localeCompare(`${b.girl.firstName} ${b.girl.lastName}`);
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

  parentStartedBadgeProgress(girl: Girl): GirlBadgeProgress[] {
    return this.badgeProgressForGirl(girl).filter((progress) => progress.status !== 'not-started');
  }

  private parentContactsFromForm(parentAccountIds: string[], additionalGuardians: string): ParentContact[] {
    const accountContacts = parentAccountIds
      .map((accountId) => this.parentAccounts().find((account) => account.id === accountId))
      .filter((account): account is Account => Boolean(account))
      .map((account) => ({
        name: account.name || account.email,
        relationship: 'Parent',
        phone: '',
        email: account.email,
        authorizedPickup: true
      }));
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

    return [...accountContacts, ...additional];
  }

  private pickupNamesFromContacts(parentContacts: ParentContact[], authorizedPickupNames: string): string[] {
    const names = authorizedPickupNames
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean);

    return Array.from(new Set([...parentContacts.filter((contact) => contact.authorizedPickup).map((contact) => contact.name), ...names].filter(Boolean)));
  }

  private emptyParentContact(): ParentContact {
    return {
      name: '',
      relationship: 'Parent',
      phone: '',
      email: '',
      authorizedPickup: true
    };
  }

  private linesFromText(value: string): string[] {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
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

  formatEventTime(value: string): string {
    if (!value) {
      return 'Time TBD';
    }

    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);

    return new Intl.DateTimeFormat([], {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
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
