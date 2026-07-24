import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CrossfitLog,
  CrossfitLogDraft,
  CrossfitService,
  CrossfitType,
  LibraryDraft,
  LibraryWorkout,
} from './crossfit.service';

const TYPE_LABELS: Record<CrossfitType, string> = {
  for_time: 'For Time',
  amrap: 'AMRAP',
  rounds: 'Runden',
  intervals: 'Intervalle',
};

@Component({
  selector: 'app-crossfit',
  imports: [FormsModule, RouterLink],
  templateUrl: './crossfit.html',
  styleUrl: './crossfit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Crossfit {
  private readonly service = inject(CrossfitService);

  readonly library = signal<LibraryWorkout[]>([]);
  readonly logs = signal<CrossfitLog[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly query = signal('');
  readonly favouritesOnly = signal(false);
  readonly tab = signal<'library' | 'history'>('library');
  readonly libraryEditorOpen = signal(false);
  readonly logEditorOpen = signal(false);
  readonly editingLibraryId = signal<string | null>(null);
  readonly selectedLibrary = signal<LibraryWorkout | null>(null);

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
  readonly logDoneAlone = signal(false);
  readonly logNotes = signal('');

  readonly filteredLibrary = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.library().filter(
      (workout) =>
        (!this.favouritesOnly() || workout.is_favourite) &&
        (!query ||
          `${workout.name} ${workout.description ?? ''} ${(workout.exercises ?? []).join(' ')}`
            .toLowerCase()
            .includes(query)),
    );
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
    this.selectedLibrary.set(workout);
    this.logDate.set(this.today());
    this.logDuration.set('');
    this.logRounds.set(null);
    this.logReps.set(null);
    this.logDnf.set(false);
    this.logMissingReps.set(null);
    this.logDoneAlone.set(false);
    this.logNotes.set('');
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
      crossfit_description: workout.description,
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
      await this.service.saveLog(draft);
      this.logEditorOpen.set(false);
      this.tab.set('history');
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
