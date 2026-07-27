import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Equipment,
  Exercise,
  PlanExercise,
  TrainingPlan,
  TrainingService,
} from './training.service';

@Component({
  selector: 'app-training',
  imports: [FormsModule, RouterLink],
  templateUrl: './training.html',
  styleUrl: './training.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Training {
  private readonly service = inject(TrainingService);
  readonly tab = signal<'exercises' | 'equipment' | 'muscles'>('exercises');
  readonly equipment = signal<Equipment[]>([]);
  readonly exercises = signal<Exercise[]>([]);
  readonly plans = signal<TrainingPlan[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly query = signal('');
  readonly editor = signal<'exercise' | 'equipment' | 'plan' | 'log' | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly selectedMuscle = signal('Chest');
  readonly muscleGroups = [
    'Chest',
    'Back',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Forearms',
    'Core',
    'Quads',
    'Glutes',
    'Hamstrings',
    'Calves',
  ];

  readonly name = signal('');
  readonly icon = signal('🏋️');
  readonly selectedEquipment = signal<string[]>([]);
  readonly muscles = signal('');
  readonly capabilities = signal({
    oneRm: false,
    maxReps: false,
    kg: false,
    meter: false,
    reps: true,
    calories: false,
    time: false,
  });
  readonly description = signal('');
  readonly duration = signal('');
  readonly planExercises = signal<PlanExercise[]>([]);
  readonly exerciseToAdd = signal('');
  readonly loggingPlan = signal<TrainingPlan | null>(null);
  readonly logDate = signal(this.today());
  readonly logDuration = signal('');
  readonly logNotes = signal('');

  readonly filteredExercises = computed(() => this.filter(this.exercises(), (item) => item.name));
  readonly filteredEquipment = computed(() => this.filter(this.equipment(), (item) => item.name));
  readonly filteredPlans = computed(() =>
    this.filter(this.plans(), (item) => `${item.name} ${item.description ?? ''}`),
  );

  constructor() {
    void this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.service.load();
      this.equipment.set(data.equipment);
      this.exercises.set(data.exercises);
      this.plans.set(data.plans);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  newItem(kind: 'exercise' | 'equipment' | 'plan') {
    this.editingId.set(null);
    this.name.set('');
    this.icon.set('🏋️');
    this.selectedEquipment.set([]);
    this.muscles.set('');
    this.capabilities.set({
      oneRm: false,
      maxReps: false,
      kg: false,
      meter: false,
      reps: true,
      calories: false,
      time: false,
    });
    this.description.set('');
    this.duration.set('');
    this.planExercises.set([]);
    this.editor.set(kind);
  }

  editExercise(item: Exercise) {
    this.newItem('exercise');
    this.editingId.set(item.id);
    this.name.set(item.name);
    this.selectedEquipment.set(item.equipment_ids ?? []);
    this.muscles.set((item.muscle_group_ids ?? []).join(', '));
    this.capabilities.set({
      oneRm: item.has_1rm,
      maxReps: item.has_max_reps,
      kg: item.has_kg,
      meter: item.has_meter,
      reps: item.has_reps,
      calories: item.has_calories,
      time: item.has_time,
    });
  }

  editEquipment(item: Equipment) {
    this.newItem('equipment');
    this.editingId.set(item.id);
    this.name.set(item.name);
    this.icon.set(item.icon ?? '🏋️');
  }

  editPlan(item: TrainingPlan) {
    this.newItem('plan');
    this.editingId.set(item.id);
    this.name.set(item.name);
    this.description.set(item.description ?? '');
    this.duration.set(item.duration_estimate ?? '');
    this.planExercises.set(item.exercises ?? []);
  }

  toggleEquipment(id: string, checked: boolean) {
    this.selectedEquipment.update((values) =>
      checked ? [...new Set([...values, id])] : values.filter((value) => value !== id),
    );
  }

  toggleCapability(key: keyof ReturnType<typeof this.capabilities>, value: boolean) {
    this.capabilities.update((current) => ({ ...current, [key]: value }));
  }

  addPlanExercise(id: string) {
    const exercise = this.exercises().find((item) => item.id === id);
    if (!exercise) return;
    this.planExercises.update((items) => [
      ...items,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        sets: 3,
        reps: exercise.has_reps ? 10 : undefined,
      },
    ]);
    this.exerciseToAdd.set('');
  }

  removePlanExercise(index: number) {
    this.planExercises.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  updatePlanExercise(index: number, key: keyof PlanExercise, value: string | number) {
    this.planExercises.update((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  }

  movePlanExercise(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.planExercises().length) return;
    this.planExercises.update((items) => {
      const copy = [...items];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async save() {
    if (!this.name().trim()) {
      this.error.set('Name ist erforderlich.');
      return;
    }
    try {
      if (this.editor() === 'equipment') {
        await this.service.saveEquipment(
          { name: this.name().trim(), icon: this.icon().trim() || null },
          this.editingId() ?? undefined,
        );
      } else if (this.editor() === 'exercise') {
        const capability = this.capabilities();
        await this.service.saveExercise(
          {
            name: this.name().trim(),
            equipment_ids: this.selectedEquipment(),
            muscle_group_ids: this.muscles()
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            has_1rm: capability.oneRm,
            has_max_reps: capability.maxReps,
            has_kg: capability.kg,
            has_meter: capability.meter,
            has_reps: capability.reps,
            has_calories: capability.calories,
            has_time: capability.time,
          },
          this.editingId() ?? undefined,
        );
      } else if (this.editor() === 'plan') {
        if (!this.planExercises().length) {
          this.error.set('Mindestens eine Übung ist erforderlich.');
          return;
        }
        await this.service.savePlan(
          {
            name: this.name().trim(),
            description: this.description().trim() || null,
            duration_estimate: this.duration().trim() || null,
            exercises: this.planExercises(),
          },
          this.editingId() ?? undefined,
        );
      }
      this.editor.set(null);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  async remove() {
    const id = this.editingId();
    const kind = this.editor();
    if (!id || !kind || !confirm(`${this.name()} löschen?`)) return;
    try {
      if (kind === 'exercise') await this.service.deleteExercise(id);
      if (kind === 'equipment') await this.service.deleteEquipment(id);
      if (kind === 'plan') await this.service.deletePlan(id);
      this.editor.set(null);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  openLog(plan: TrainingPlan) {
    this.loggingPlan.set(plan);
    this.logDate.set(this.today());
    this.logDuration.set('');
    this.logNotes.set('');
    this.editor.set('log');
  }

  async saveLog() {
    const plan = this.loggingPlan();
    if (!plan) return;
    try {
      await this.service.logPlan(plan, this.logDate(), this.logDuration(), this.logNotes());
      this.editor.set(null);
    } catch (error) {
      this.error.set(this.message(error));
    }
  }

  equipmentNames(ids: string[]) {
    return ids
      .map((id) => this.equipment().find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  capabilityLabels(item: Exercise) {
    return [
      item.has_kg && 'kg',
      item.has_reps && 'Reps',
      item.has_time && 'Zeit',
      item.has_meter && 'Meter',
      item.has_calories && 'Kalorien',
      item.has_1rm && '1RM',
      item.has_max_reps && 'Max Reps',
    ].filter(Boolean);
  }

  private filter<T>(items: T[], text: (item: T) => string) {
    const query = this.query().trim().toLowerCase();
    return items.filter((item) => !query || text(item).toLowerCase().includes(query));
  }

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Etwas ist schiefgelaufen.';
  }
}
