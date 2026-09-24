import { useEffect } from "react";
import { Link } from "react-router";
import { clearDraft } from "../../texts/draft";
import { TextsShell } from "./parts";
import s from "./texts.module.css";

/** Stripe Checkout's success_url. Payment is done; now they confirm by text. */
export default function TextsWelcomePage() {
  useEffect(() => clearDraft(), []);

  return (
    <TextsShell>
      <div className={s.eyebrow}>You're signed up</div>
      <h1 className={s.title}>
        Now, check <em>your phone.</em>
      </h1>
      <p className={s.desc}>
        We've sent you a text. Reply <strong>YES</strong> to confirm, and your first prompt will
        follow at your chosen time.
      </p>
      <div className={s.phoneMock} aria-hidden="true">
        <div className={s.bubble}>
          PetalProgress: Welcome! Reply YES to start your journal prompts. Msg &amp; data rates may
          apply. Reply STOP to cancel, HELP for help.
        </div>
        <div className={s.bubbleMe}>YES</div>
      </div>
      <p className={s.fine} style={{ marginBottom: 20 }}>
        No text after a few minutes? Check the number on your texts page, or reply to any of our
        messages with HELP.
      </p>
      <Link to="/texts/account" className={s.btnNext} style={{ display: "block" }}>
        Go to your texts
      </Link>
    </TextsShell>
  );
}
