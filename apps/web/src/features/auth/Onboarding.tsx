import { useRef, useState, type FormEvent } from "react";
import { AreaRadiusPicker } from "../preferences/AreaRadiusPicker";
import { InterestPicker } from "../preferences/InterestPicker";
import { useProfile } from "../profile/ProfileStore";
import { Ribbon } from "../profile/Ribbon";
import { AGE_RANGES } from "../profile/types";
import "../profile/profile.css";
import { UNDER_18, checkAge, checkDisplayName, type AgeAnswer } from "./ageValidation";

const STEPS = ["About you", "Your area", "Your interests"] as const;

/** Three-step first run: who you are, roughly where, and what you like. */
export function Onboarding({ onComplete }: { onComplete?: () => void }) {
  const { profile, update } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.displayName);
  const [age, setAge] = useState<AgeAnswer>(profile.ageRange ?? "");
  const [adult, setAdult] = useState(profile.ageConfirmed);
  const [gender, setGender] = useState(profile.gender);
  const [areaId, setAreaId] = useState(profile.areaId);
  const [radiusKm, setRadiusKm] = useState(profile.radiusKm);
  const [interests, setInterests] = useState(profile.interests);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  function go(next: number) {
    setErrors({});
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 0) {
      const nameError = checkDisplayName(name);
      const ageCheck = checkAge(age, adult);
      if (!ageCheck.ok && ageCheck.blocked) { setBlocked(true); return; }
      const nextErrors: Record<string, string> = {};
      if (nameError) nextErrors.name = nameError;
      if (!ageCheck.ok) nextErrors.age = ageCheck.message;
      if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
      go(1);
    } else if (step === 1) {
      if (!areaId) { setErrors({ area: "Choose the area you want to find events around." }); return; }
      go(2);
    } else {
      if (interests.length === 0) { setErrors({ interests: "Pick at least one interest so we can recommend events." }); return; }
      const ageCheck = checkAge(age, adult);
      if (!ageCheck.ok) { go(0); return; }
      update({ onboarded: true, displayName: name.trim(), ageRange: ageCheck.ageRange, ageConfirmed: true,
        gender: gender.trim(), areaId, radiusKm, interests });
      onComplete?.();
    }
  }

  if (blocked) {
    return (
      <section className="tp tp-onboarding" aria-labelledby="tp-blocked-heading">
        <div className="tp-panel tp-panel-narrow" data-tint="mint">
          <h1 id="tp-blocked-heading" className="tp-title">ThirdPlace is for adults</h1>
          <p>ThirdPlace is only for people aged 18 or over, so you can't create an account yet. Nothing you entered has been saved.</p>
          <button type="button" className="tp-button tp-button-quiet" onClick={() => { setBlocked(false); setAge(""); }}>
            I picked the wrong age range
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tp tp-onboarding" aria-labelledby="tp-onboarding-heading">
      <form className="tp-panel tp-panel-narrow" data-tint="mint" onSubmit={submit} noValidate>
        <Ribbon />
        <ol className="tp-steps" aria-label="Setup progress">
          {STEPS.map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined} data-done={index < step || undefined}>{label}</li>
          ))}
        </ol>
        <h1 id="tp-onboarding-heading" className="tp-title" tabIndex={-1} ref={heading}>
          {step === 0 ? "Who's joining?" : step === 1 ? "Where do you want to go out?" : "What are you into?"}
        </h1>

        {step === 0 && (
          <>
            <div className="tp-field">
              <label className="tp-label" htmlFor="tp-name">Name shown to others</label>
              <input id="tp-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name"
                maxLength={40} aria-invalid={Boolean(errors.name)} aria-describedby="tp-name-hint" />
              <p className="tp-hint" id="tp-name-hint">A first name or nickname is enough.</p>
              {errors.name && <p className="tp-error" role="alert">{errors.name}</p>}
            </div>
            <div className="tp-field">
              <label className="tp-label" htmlFor="tp-age">Age range</label>
              <select id="tp-age" value={age} onChange={(event) => setAge(event.target.value as AgeAnswer)} aria-invalid={Boolean(errors.age)}>
                <option value="">Choose an age range</option>
                <option value={UNDER_18}>Under 18</option>
                {AGE_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
              </select>
              <p className="tp-hint">We ask for a range, not a birth date. It stays private unless you choose to show it.</p>
              <label className="tp-check">
                <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
                <span>I confirm I am 18 or over</span>
              </label>
              {errors.age && <p className="tp-error" role="alert">{errors.age}</p>}
            </div>
            <div className="tp-field">
              <label className="tp-label" htmlFor="tp-gender">Gender <span className="tp-optional">optional</span></label>
              <input id="tp-gender" value={gender} onChange={(event) => setGender(event.target.value)} maxLength={40}
                placeholder="Describe it in your own words" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="tp-lede">Choose an area, not an address. Other people only ever see the area name.</p>
            <AreaRadiusPicker areaId={areaId} radiusKm={radiusKm} onAreaChange={(id) => { setAreaId(id); setErrors({}); }} onRadiusChange={setRadiusKm} error={errors.area} />
          </>
        )}

        {step === 2 && (
          <>
            <p className="tp-lede">Your feed only recommends events that match these. Change them any time in Profile.</p>
            <InterestPicker selected={interests} onChange={(next) => { setInterests(next); setErrors({}); }} legend="Pick what you'd turn up for" error={errors.interests} />
          </>
        )}

        <div className="tp-actions">
          {step > 0 && <button type="button" className="tp-button tp-button-quiet" onClick={() => go(step - 1)}>Back</button>}
          <button type="submit" className="tp-button">{step === 2 ? "Finish setup" : "Continue"}</button>
        </div>
      </form>
    </section>
  );
}
