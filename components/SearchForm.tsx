"use client";

import Form from "next/form";
import { ALLOWED_WINDOWS, MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/lib/config";

interface Props {
  initialQuery: string;
  initialDays: number;
}

export function SearchForm({ initialQuery, initialDays }: Props) {
  return (
    <Form action="/" className="search" role="search">
      <div className="search-row">
        <label htmlFor="q" className="sr-only">
          Məhsul və ya kateqoriya
        </label>
        <span className="field">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={initialQuery}
            placeholder="Məhsul və ya kateqoriya"
            minLength={MIN_QUERY_LENGTH}
            maxLength={MAX_QUERY_LENGTH}
            required
            autoComplete="off"
            enterKeyHint="search"
          />
        </span>
        <button type="submit">Axtar</button>
      </div>

      <fieldset className="window">
        <legend>Son neçə günün qiymətləri</legend>
        <div className="window-options">
          {ALLOWED_WINDOWS.map((days) => (
            <label key={days}>
              <input
                type="radio"
                name="days"
                value={days}
                defaultChecked={days === initialDays}
                onChange={(event) => {
                  const form = event.currentTarget.form;
                  if (form?.checkValidity()) form.requestSubmit();
                }}
              />
              <span>{days} gün</span>
            </label>
          ))}
        </div>
      </fieldset>
    </Form>
  );
}
