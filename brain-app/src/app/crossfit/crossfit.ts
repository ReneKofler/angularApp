import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CrossfitLog,
  CrossfitLogDraft,
  CrossfitService,
  CrossfitType,
  LibraryDraft,
  LibraryWorkout,
  OneRmExercise,
  PersonalRecord,
  PersonalRecordDraft,
} from './crossfit.service';

const TYPE_LABELS: Record<CrossfitType, string> = {
  for_time: 'FOR_TIME',
  amrap: 'AMRAP',
  emom: 'EMOM',
  tabata: 'TABATA',
  custom: 'CUSTOM',
};

const EQUIPMENT = [
  '📦 Box',
  '🔗 Kettlebell',
  '🪜 Klimmzugstange',
  '🏋️ Kurzhantel',
  '🏋️ Langhantel',
  '🥕 Ringe',
  '🚣 Rudergerät',
  '🔴 Sandbag',
  '🛷 Schlitten',
  '🧬 Springseil',
  '🎯 Target',
  '🧱 Wand',
];

@Component({
  selector: 'app-crossfit',
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './crossfit.html',
  styleUrl: './crossfit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Crossfit {
  private readonly service = inject(CrossfitService);

  readonly library = signal<LibraryWorkout[]>([]);
  readonly logs = signal<CrossfitLog[]>([]);
  readonly exercises = signal<OneRmExercise[]>([]);
  readonly records = signal<PersonalRecord[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly query = signal('');
  readonly favouritesOnly = signal(false);
  readonly tab = signal<'sports' | 'workouts'>('sports');
  readonly sort = signal<'newest' | 'oldest' | 'name'>('newest');
  readonly typeFilter = signal<'all' | CrossfitType | 'hero' | 'girl' | 'open'>('all');
  readonly focusFilter = signal<'all' | 'conditioning' | 'strength'>('all');
  readonly equipmentFilter = signal('');
  readonly oneRmOpen = signal(false);
  readonly oneRmExerciseId = signal('');
  readonly oneRmWeight = signal<number | null>(null);
  readonly oneRmReps = signal<number | null>(null);
  readonly recordsOpen = signal(false);
  readonly recordEditorOpen = signal(false);
  readonly editingRecordId = signal<string | null>(null);
  readonly recordName = signal('');
  readonly recordValue = signal('');
  readonly recordUnit = signal('kg');
  readonly recordDate = signal(this.today());
  readonly libraryEditorOpen = signal(false);
  readonly logEditorOpen = signal(false);
  readonly inlineCaptureOpen = signal(false);
  readonly editingLibraryId = signal<string | null>(null);
  readonly selectedLibrary = signal<LibraryWorkout | null>(null);
  readonly editingLogId = signal<string | null>(null);

  readonly libraryName = signal('');
  readonly libraryType = signal<CrossfitType>('for_time');
  readonly libraryExercises = signal('');
  readonly libraryDescription = signal('');
  readonly libraryTimeCap = signal<number | null>(null);
  readonly libraryRounds = signal<number | null>(null);
  readonly libraryAmrapDuration = signal<number | null>(null);
  readonly libraryWorkMinutes = signal<number | null>(null);
  readonly libraryRestMinutes = signal<number | null>(null);
  readonly libraryTotalReps = signal<number | null>(null);
  readonly libraryFocus = signal('');
  readonly libraryFavourite = signal(false);
  readonly libraryHero = signal(false);
  readonly libraryGirl = signal(false);
  readonly libraryOpen = signal(false);
  readonly libraryPartner = signal(false);

  readonly logDate = signal(this.today());
  readonly logDuration = signal('');
  readonly logRounds = signal<number | null>(null);
  readonly logReps = signal<number | null>(null);
  readonly logDnf = signal(false);
  readonly logMissingReps = signal<number | null>(null);
  readonly logHeartRate = signal<number | null>(null);
  readonly logFocus = signal<'conditioning' | 'strength'>('conditioning');
  readonly logDoneAlone = signal(false);
  readonly logNotes = signal('');

  readonly filteredLibrary = computed(() => {
    const query = this.query().trim().toLowerCase();
    const type = this.typeFilter();
    const focus = this.focusFilter();
    const equipment = this.equipmentFilter()
      .replace(/^\S+\s/, '')
      .toLowerCase();
    return this.library()
      .filter(
        (workout) =>
          (!this.favouritesOnly() || workout.is_favourite) &&
          (type === 'all' ||
            workout.crossfit_type === type ||
            (type === 'hero' && workout.is_hero) ||
            (type === 'girl' && workout.is_girl) ||
            (type === 'open' && workout.is_open)) &&
          (focus === 'all' || workout.crossfit_focus === focus) &&
          (!equipment ||
            `${workout.name} ${(workout.exercises ?? []).join(' ')} ${workout.description ?? ''}`
              .toLowerCase()
              .includes(equipment)) &&
          (!query ||
            `${workout.name} ${workout.description ?? ''} ${(workout.exercises ?? []).join(' ')}`
              .toLowerCase()
              .includes(query)),
      )
      .sort((a, b) => {
        if (this.sort() === 'name') return a.name.localeCompare(b.name);
        const direction = this.sort() === 'oldest' ? 1 : -1;
        return (a.created_at ?? '').localeCompare(b.created_at ?? '') * direction;
      });
  });
  readonly equipment = EQUIPMENT;
  readonly typeFilters: {
    value: 'all' | CrossfitType | 'hero' | 'girl' | 'open';
    label: string;
  }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'for_time', label: 'FOR_TIME' },
    { value: 'emom', label: 'EMOM' },
    { value: 'amrap', label: 'AMRAP' },
    { value: 'tabata', label: 'TABATA' },
    { value: 'custom', label: 'CUSTOM' },
    { value: 'hero', label: 'Hero WOD' },
    { value: 'girl', label: 'Girl WOD' },
    { value: 'open', label: 'Open Workout' },
  ];
  readonly filteredLogs = computed(() => {
    const query = this.query().trim().toLowerCase();
    const type = this.typeFilter();
    const focus = this.focusFilter();
    const equipment = this.equipmentFilter()
      .replace(/^\S+\s/, '')
      .toLowerCase();
    const matches = this.logs().filter((log) => {
      const haystack =
        `${log.workout_name ?? ''} ${(log.exercises ?? []).join(' ')} ${log.crossfit_description ?? ''} ${log.description ?? ''}`.toLowerCase();
      const matchesType =
        type === 'all' ||
        log.crossfit_type === type ||
        (type === 'hero' && !!log.is_hero) ||
        (type === 'girl' && !!log.is_girl) ||
        (type === 'open' && !!log.is_open);
      const matchesFocus =
        focus === 'all' ||
        `${log.crossfit_description ?? ''} ${log.description ?? ''}`.toLowerCase().includes(focus);
      return (
        matchesType &&
        matchesFocus &&
        (!query || haystack.includes(query)) &&
        (!equipment || haystack.includes(equipment))
      );
    });
    return [...matches].sort((a, b) => {
      if (this.sort() === 'name') return (a.workout_name ?? '').localeCompare(b.workout_name ?? '');
      const direction = this.sort() === 'oldest' ? 1 : -1;
      return a.workout_date.localeCompare(b.workout_date) * direction;
    });
  });
  readonly estimatedOneRm = computed(() => {
    const weight = this.oneRmWeight();
    const reps = this.oneRmReps();
    if (!weight || !reps || reps < 1) return null;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
  });

  constructor() {
    void this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.service.load();
      this.library.set(data.library);
      this.logs.set(data.logs);
      this.exercises.set(data.exercises ?? []);
      this.records.set(data.records ?? []);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  typeLabel(type: CrossfitType | null) {
    return type ? TYPE_LABELS[type] : 'CrossFit';
  }

  tags(workout: LibraryWorkout | CrossfitLog) {
    const values = [];
    if (workout.is_hero) values.push('Hero');
    if (workout.is_girl) values.push('Girl');
    if (workout.is_open) values.push('Open');
    if (workout.is_partner) values.push('Partner');
    return values;
  }

  prescription(workout: LibraryWorkout) {
    const values = [];
    if (workout.amrap_duration) values.push(`${workout.amrap_duration} Min.`);
    if (workout.time_cap) values.push(`Time Cap ${workout.time_cap} Min.`);
    if (workout.rounds) values.push(`${workout.rounds} Runden`);
    if (workout.work_minutes != null) values.push(`${workout.work_minutes} Min. Arbeit`);
    if (workout.rest_minutes != null) values.push(`${workout.rest_minutes} Min. Pause`);
    if (workout.total_reps != null) values.push(`${workout.total_reps} Reps`);
    return values.join(' · ');
  }

  result(log: CrossfitLog) {
    const values = [];
    if (log.dnf) {
      values.push(`DNF${log.missing_reps ? ` · ${log.missing_reps} Reps fehlen` : ''}`);
    } else if (log.duration) {
      values.push(log.duration);
    }
    if (log.result_rounds != null) values.push(`${log.result_rounds} Runden`);
    if (log.total_reps != null) values.push(`${log.total_reps} Reps`);
    if (log.is_partner) values.push(log.done_alone ? 'Alleine absolviert' : 'Partner');
    return values.join(' · ') || 'Kein Ergebnis';
  }

  newLibrary() {
    this.resetLibrary();
    this.libraryEditorOpen.set(true);
  }

  equipmentFor(workout: LibraryWorkout) {
    const text =
      `${workout.name} ${(workout.exercises ?? []).join(' ')} ${workout.description ?? ''}`.toLowerCase();
    const aliases: [string, string[]][] = [
      ['📦 Box', ['box', 'box jump']],
      ['🔗 Kettlebell', ['kettlebell', 'kb']],
      ['🪜 Klimmzugstange', ['pull-up', 'pullup', 'klimmzug']],
      ['🏋️ Kurzhantel', ['dumbbell', 'kurzhantel']],
      ['🏋️ Langhantel', ['barbell', 'snatch', 'clean', 'thruster']],
      ['🥕 Ringe', ['ring']],
      ['🚣 Rudergerät', ['row', 'rudern']],
      ['🔴 Sandbag', ['sandbag']],
      ['🛷 Schlitten', ['sled', 'schlitten']],
      ['🧬 Springseil', ['rope', 'double-under', 'single-under']],
      ['🎯 Target', ['wall ball', 'target']],
      ['🧱 Wand', ['wall walk', 'handstand']],
    ];
    return aliases
      .filter(([, terms]) => terms.some((term) => text.includes(term)))
      .map(([label]) => label);
  }

  editLibrary(workout: LibraryWorkout) {
    if (!workout.user_id) return;
    this.editingLibraryId.set(workout.id);
    this.libraryName.set(workout.name);
    this.libraryType.set(workout.crossfit_type);
    this.libraryExercises.set((workout.exercises ?? []).join('\n'));
    this.libraryDescription.set(workout.description ?? '');
    this.libraryTimeCap.set(workout.time_cap);
    this.libraryRounds.set(workout.rounds);
    this.libraryAmrapDuration.set(workout.amrap_duration);
    this.libraryWorkMinutes.set(workout.work_minutes);
    this.libraryRestMinutes.set(workout.rest_minutes);
    this.libraryTotalReps.set(workout.total_reps);
    this.libraryFocus.set(workout.crossfit_focus ?? '');
    this.libraryFavourite.set(workout.is_favourite);
    this.libraryHero.set(workout.is_hero);
    this.libraryGirl.set(workout.is_girl);
    this.libraryOpen.set(workout.is_open);
    this.libraryPartner.set(workout.is_partner);
    this.libraryEditorOpen.set(true);
  }

  async saveLibrary() {
    const name = this.libraryName().trim();
    const exercises = this.exerciseList();
    if (!name || !exercises.length) {
      this.error.set('Name und mindestens eine Übung sind erforderlich.');
      return;
    }
    const draft: LibraryDraft = {
      name,
      crossfit_type: this.libraryType(),
      exercises,
      time_cap: this.libraryTimeCap(),
      rounds: this.libraryRounds(),
      work_minutes: this.libraryWorkMinutes(),
      rest_minutes: this.libraryRestMinutes(),
      is_favourite: this.libraryFavourite(),
      description: this.libraryDescription().trim() || null,
      amrap_duration: this.libraryAmrapDuration(),
      is_hero: this.libraryHero(),
      is_girl: this.libraryGirl(),
      is_open: this.libraryOpen(),
      total_reps: this.libraryTotalReps(),
      is_partner: this.libraryPartner(),
      crossfit_focus: this.libraryFocus().trim() || null,
    };
    this.saving.set(true);
    this.error.set('');
    try {
      await this.service.saveLibrary(draft, this.editingLibraryId() ?? undefined);
      this.libraryEditorOpen.set(false);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.saving.set(false);
    }
  }

  async toggleFavourite(workout: LibraryWorkout) {
    if (!workout.user_id) {
      this.error.set('Vordefinierte Workouts können nicht verändert werden.');
      return;
    }
    try {
      await this.service.toggleFavourite(workout);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  async deleteLibrary() {
    const id = this.editingLibraryId();
    if (!id || !confirm('Workout aus der Bibliothek löschen?')) return;
    try {
      await this.service.deleteLibrary(id);
      this.libraryEditorOpen.set(false);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  startLog(workout: LibraryWorkout) {
    this.inlineCaptureOpen.set(false);
    this.editingLogId.set(null);
    this.selectedLibrary.set(workout);
    this.logDate.set(this.today());
    this.logDuration.set('');
    this.logRounds.set(null);
    this.logReps.set(null);
    this.logDnf.set(false);
    this.logMissingReps.set(null);
    this.logHeartRate.set(null);
    this.logFocus.set(workout.crossfit_focus === 'strength' ? 'strength' : 'conditioning');
    this.logDoneAlone.set(false);
    this.logNotes.set('');
    this.logEditorOpen.set(true);
  }

  newSport() {
    this.editingLogId.set(null);
    this.selectedLibrary.set(null);
    this.logDate.set(this.today());
    this.logDuration.set('');
    this.logRounds.set(null);
    this.logReps.set(null);
    this.logDnf.set(false);
    this.logMissingReps.set(null);
    this.logHeartRate.set(null);
    this.logFocus.set('conditioning');
    this.logDoneAlone.set(false);
    this.logNotes.set('');
    this.logEditorOpen.set(false);
    this.inlineCaptureOpen.set(true);
  }

  selectLibrary(id: string) {
    this.selectedLibrary.set(this.library().find((workout) => workout.id === id) ?? null);
  }

  editLog(log: CrossfitLog) {
    this.inlineCaptureOpen.set(false);
    this.editingLogId.set(log.id);
    this.selectedLibrary.set(
      this.library().find((workout) => workout.name === log.workout_name) ??
        this.libraryFromLog(log),
    );
    this.logDate.set(log.workout_date);
    this.logDuration.set(log.duration ?? '');
    this.logRounds.set(log.result_rounds);
    this.logReps.set(log.total_reps);
    this.logDnf.set(!!log.dnf);
    this.logMissingReps.set(log.missing_reps);
    this.logHeartRate.set(log.avg_heart_rate);
    this.logFocus.set(log.crossfit_description === 'strength' ? 'strength' : 'conditioning');
    this.logDoneAlone.set(!!log.done_alone);
    this.logNotes.set(log.notes ?? '');
    this.logEditorOpen.set(true);
  }

  async saveLog() {
    const workout = this.selectedLibrary();
    if (!workout || !this.logDate()) {
      this.error.set('Workout und Datum sind erforderlich.');
      return;
    }
    if (!this.logDnf() && workout.crossfit_type === 'for_time' && !this.logDuration().trim()) {
      this.error.set('Bitte eine Zeit eintragen oder DNF markieren.');
      return;
    }
    if (this.logDnf() && (this.logMissingReps() ?? 0) < 0) {
      this.error.set('Fehlende Wiederholungen dürfen nicht negativ sein.');
      return;
    }
    const draft: CrossfitLogDraft = {
      workout_type: 'crossfit',
      workout_date: this.logDate(),
      workout_name: workout.name,
      crossfit_type: workout.crossfit_type,
      crossfit_description: this.logFocus(),
      exercises: workout.exercises,
      time_cap: workout.time_cap,
      rounds: workout.rounds,
      work_minutes: workout.work_minutes,
      rest_minutes: workout.rest_minutes,
      duration: this.logDnf() ? null : this.logDuration().trim() || null,
      result_rounds: this.logRounds(),
      total_reps: this.logReps(),
      dnf: this.logDnf(),
      missing_reps: this.logDnf() ? this.logMissingReps() : null,
      avg_heart_rate: this.logHeartRate(),
      is_hero: workout.is_hero,
      is_girl: workout.is_girl,
      is_open: workout.is_open,
      is_partner: workout.is_partner,
      done_alone: workout.is_partner ? this.logDoneAlone() : null,
      notes: this.logNotes().trim() || null,
    };
    this.saving.set(true);
    this.error.set('');
    try {
      const editingId = this.editingLogId();
      if (editingId) {
        await this.service.saveLog(draft, editingId);
      } else {
        await this.service.saveLog(draft);
      }
      this.logEditorOpen.set(false);
      this.inlineCaptureOpen.set(false);
      this.tab.set('sports');
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteLog(log: CrossfitLog) {
    if (!confirm(`${log.workout_name ?? 'CrossFit Workout'} löschen?`)) return;
    try {
      await this.service.deleteLog(log.id);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  async deleteEditingLog() {
    const log = this.logs().find((item) => item.id === this.editingLogId());
    if (!log || !confirm(`${log.workout_name ?? 'CrossFit Workout'} löschen?`)) return;
    try {
      await this.service.deleteLog(log.id);
      this.logEditorOpen.set(false);
      this.editingLogId.set(null);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  openOneRm() {
    this.oneRmExerciseId.set('');
    this.oneRmWeight.set(null);
    this.oneRmReps.set(null);
    this.oneRmOpen.set(true);
  }

  openRecords() {
    this.recordEditorOpen.set(false);
    this.recordsOpen.set(true);
  }

  newRecord() {
    this.editingRecordId.set(null);
    this.recordName.set('');
    this.recordValue.set('');
    this.recordUnit.set('kg');
    this.recordDate.set(this.today());
    this.recordEditorOpen.set(true);
  }

  editRecord(record: PersonalRecord) {
    this.editingRecordId.set(record.id);
    this.recordName.set(record.record_name ?? '');
    this.recordValue.set(record.value);
    this.recordUnit.set(record.unit ?? 'kg');
    this.recordDate.set(record.record_date);
    this.recordEditorOpen.set(true);
  }

  async saveRecord() {
    if (!this.recordName().trim() || !this.recordValue().trim()) {
      this.error.set('Name und Wert sind erforderlich.');
      return;
    }
    const draft: PersonalRecordDraft = {
      record_name: this.recordName().trim(),
      value: this.recordValue().trim(),
      unit: this.recordUnit(),
      record_date: this.recordDate(),
    };
    try {
      await this.service.saveRecord(draft, this.editingRecordId() ?? undefined);
      this.recordEditorOpen.set(false);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  async deleteRecord() {
    const id = this.editingRecordId();
    if (!id || !confirm('Persönlichen Rekord löschen?')) return;
    try {
      await this.service.deleteRecord(id);
      this.recordEditorOpen.set(false);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  recordDisplay(record: PersonalRecord) {
    return `${record.value}${record.unit ? ` ${record.unit}` : ''}`;
  }

  displayDate(value: string) {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${Number(match[3])}.${Number(match[2])}.${match[1]}` : value;
  }

  private libraryFromLog(log: CrossfitLog): LibraryWorkout {
    return {
      id: `log-${log.id}`,
      user_id: null,
      name: log.workout_name ?? 'CrossFit Workout',
      crossfit_type: log.crossfit_type ?? 'custom',
      exercises: log.exercises,
      time_cap: log.time_cap,
      rounds: log.rounds,
      work_minutes: log.work_minutes,
      rest_minutes: log.rest_minutes,
      is_favourite: false,
      description: log.description ?? null,
      amrap_duration: null,
      is_hero: !!log.is_hero,
      is_girl: !!log.is_girl,
      is_open: !!log.is_open,
      total_reps: log.total_reps,
      is_partner: !!log.is_partner,
      crossfit_focus: log.crossfit_description,
    };
  }

  private exerciseList() {
    return this.libraryExercises()
      .split(/\r?\n/)
      .map((exercise) => exercise.trim())
      .filter(Boolean);
  }

  private resetLibrary() {
    this.editingLibraryId.set(null);
    this.libraryName.set('');
    this.libraryType.set('for_time');
    this.libraryExercises.set('');
    this.libraryDescription.set('');
    this.libraryTimeCap.set(null);
    this.libraryRounds.set(null);
    this.libraryAmrapDuration.set(null);
    this.libraryWorkMinutes.set(null);
    this.libraryRestMinutes.set(null);
    this.libraryTotalReps.set(null);
    this.libraryFocus.set('');
    this.libraryFavourite.set(false);
    this.libraryHero.set(false);
    this.libraryGirl.set(false);
    this.libraryOpen.set(false);
    this.libraryPartner.set(false);
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Etwas ist schiefgelaufen.';
  }
}
