import type { CSSProperties, JSX, ReactNode } from 'react'
import { selectSettings, useAppState, useController } from '@/app/hooks'
import type { FpsCap, QualitySetting, ThemeName, TransitionName } from '@/app/settings'
import { Icon } from '@/components/Icon'
import { Panel } from '@/components/Panel'

const QUALITY_OPTIONS: { value: QualitySetting; label: string }[] = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'ultra', label: 'Ultra' },
  { value: 'auto', label: 'Automatica' },
]

const FPS_OPTIONS: { value: FpsCap; label: string }[] = [
  { value: 30, label: '30' },
  { value: 60, label: '60' },
  { value: 120, label: '120' },
  { value: 0, label: 'Illimitato' },
]

const THEME_OPTIONS: { value: ThemeName; label: string }[] = [
  { value: 'blue', label: 'Azzurro' },
  { value: 'violet', label: 'Viola' },
  { value: 'aqua', label: 'Acqua' },
  { value: 'magma', label: 'Magma' },
]

const TRANSITION_OPTIONS: { value: TransitionName; label: string }[] = [
  { value: 'random', label: 'Casuale' },
  { value: 'dissolve', label: 'Sfaldamento' },
  { value: 'zoom', label: 'Zoom blur' },
  { value: 'ripple', label: 'Onda' },
  { value: 'slice', label: 'Fasce' },
]

export function SettingsPanel(): JSX.Element {
  const controller = useController()
  const settings = useAppState(selectSettings)
  const bridge = controller.bridge

  return (
    <Panel
      title="Impostazioni"
      subtitle="Tutto resta sul computer, nessuna connessione richiesta"
      onClose={() => controller.closePanel()}
      footer={
        <button type="button" className="dpv-button" onClick={() => controller.resetSettings()}>
          <Icon name="reset" size={16} />
          Ripristina valori predefiniti
        </button>
      }
    >
      <Section title="Grafica">
        <Choice
          label="Qualita'"
          value={settings.quality}
          options={QUALITY_OPTIONS}
          onChange={(quality) => controller.updateSettings({ quality })}
          hint="Automatica riduce la risoluzione interna quando gli FPS calano."
        />
        <Choice
          label="Limite FPS"
          value={settings.fpsCap}
          options={FPS_OPTIONS}
          onChange={(fpsCap) => controller.updateSettings({ fpsCap })}
        />
        <Range
          label="Intensita' effetti"
          value={settings.intensity}
          min={0}
          max={2}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(intensity) => controller.updateSettings({ intensity })}
        />
      </Section>

      <Section title="Reattivita' audio">
        <Range
          label="Sensibilita' globale"
          value={settings.sensitivity.global}
          min={0.2}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          onChange={(global) =>
            controller.updateSettings({ sensitivity: { ...settings.sensitivity, global } })
          }
        />
        <Range
          label="Bassi"
          value={settings.sensitivity.bass}
          min={0.2}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          onChange={(bass) =>
            controller.updateSettings({ sensitivity: { ...settings.sensitivity, bass } })
          }
        />
        <Range
          label="Medi"
          value={settings.sensitivity.mid}
          min={0.2}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          onChange={(mid) =>
            controller.updateSettings({ sensitivity: { ...settings.sensitivity, mid } })
          }
        />
        <Range
          label="Alti"
          value={settings.sensitivity.treble}
          min={0.2}
          max={3}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          onChange={(treble) =>
            controller.updateSettings({ sensitivity: { ...settings.sensitivity, treble } })
          }
        />
      </Section>

      <Section title="Preset">
        <Toggle
          label="Cambio automatico"
          checked={settings.autoSwitch}
          onChange={(autoSwitch) => controller.updateSettings({ autoSwitch })}
        />
        <Range
          label="Durata media di un preset"
          value={settings.presetDuration}
          min={10}
          max={300}
          step={5}
          disabled={!settings.autoSwitch}
          format={(v) => `${Math.round(v)} s`}
          onChange={(presetDuration) => controller.updateSettings({ presetDuration })}
        />
        <Toggle
          label="Aspetta un beat forte per cambiare"
          checked={settings.switchOnEvent}
          disabled={!settings.autoSwitch}
          onChange={(switchOnEvent) => controller.updateSettings({ switchOnEvent })}
        />
        <Choice
          label="Transizione"
          value={settings.transition}
          options={TRANSITION_OPTIONS}
          onChange={(transition) => controller.updateSettings({ transition })}
        />
      </Section>

      <Section title="Riproduzione">
        <Toggle
          label="Avvia la musica dopo il trascinamento"
          checked={settings.autoplayOnDrop}
          onChange={(autoplayOnDrop) => controller.updateSettings({ autoplayOnDrop })}
        />
        <Toggle
          label="Evita i duplicati in coda"
          checked={settings.preventDuplicates}
          onChange={(preventDuplicates) => controller.updateSettings({ preventDuplicates })}
        />
        <Toggle
          label="Ricorda la coda alla chiusura"
          checked={settings.rememberQueue}
          disabled={!bridge.capabilities.persistentQueue}
          hint={
            bridge.capabilities.persistentQueue
              ? undefined
              : 'Richiede il guscio desktop: dal browser i percorsi dei file non sono accessibili.'
          }
          onChange={(rememberQueue) => controller.updateSettings({ rememberQueue })}
        />
      </Section>

      <Section title="Interfaccia">
        <Choice
          label="Tema"
          value={settings.theme}
          options={THEME_OPTIONS}
          onChange={(theme) => controller.updateSettings({ theme })}
        />
        <Range
          label="Scala interfaccia"
          value={settings.uiScale}
          min={1}
          max={2}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(uiScale) => controller.updateSettings({ uiScale })}
        />
        <Toggle
          label="Riduci le animazioni"
          checked={settings.reducedMotion}
          onChange={(reducedMotion) => controller.updateSettings({ reducedMotion })}
        />
        <Toggle
          label="Mostra diagnostica FPS"
          checked={settings.showStats}
          onChange={(showStats) => controller.updateSettings({ showStats })}
        />
      </Section>

      <Section title="Scorciatoie">
        <dl className="dpv-shortcuts">
          <div><dt>Spazio</dt><dd>Play / Pausa</dd></div>
          <div><dt>← →</dt><dd>Seek di 5 secondi</dd></div>
          <div><dt>↑ ↓</dt><dd>Volume</dd></div>
          <div><dt>N</dt><dd>Traccia successiva</dd></div>
          <div><dt>B</dt><dd>Traccia precedente</dd></div>
          <div><dt>P</dt><dd>Preset successivo</dd></div>
          <div><dt>R</dt><dd>Preset casuale</dd></div>
          <div><dt>F</dt><dd>Schermo intero</dd></div>
          <div><dt>C</dt><dd>Modalita' cinema</dd></div>
          <div><dt>M</dt><dd>Silenzia</dd></div>
          <div><dt>Esc</dt><dd>Chiude pannello o schermo intero</dd></div>
        </dl>
      </Section>
    </Panel>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="dpv-section">
      <h3 className="dpv-section__title">{title}</h3>
      <div className="dpv-section__body">{children}</div>
    </section>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  hint?: string
}): JSX.Element {
  return (
    <label className="dpv-field dpv-field--toggle" data-disabled={disabled}>
      <span className="dpv-field__label">
        {label}
        {hint && <span className="dpv-field__hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="dpv-switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled = false,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
  disabled?: boolean
}): JSX.Element {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <label className="dpv-field" data-disabled={disabled}>
      <span className="dpv-field__label">
        {label}
        <b className="dpv-field__value">{format(value)}</b>
      </span>
      <input
        type="range"
        className="dpv-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--dpv-range-fill': `${percent}%` } as CSSProperties}
      />
    </label>
  )
}

function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: string
}): JSX.Element {
  return (
    <div className="dpv-field">
      <span className="dpv-field__label">
        {label}
        {hint && <span className="dpv-field__hint">{hint}</span>}
      </span>
      <div className="dpv-segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            data-active={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
