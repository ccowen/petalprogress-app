import { Link, useNavigate } from "react-router";
import { TextsShell } from "./parts";
import { PhoneCodeForm } from "./PhoneCodeForm";
import s from "./texts.module.css";

/** Returning subscribers sign in with a code texted to their phone. */
export default function TextsSignInPage() {
  const navigate = useNavigate();

  return (
    <TextsShell
      topLink={
        <Link to="/texts" className={s.topLink}>
          New here? Sign up
        </Link>
      }
    >
      <div className={s.eyebrow}>Sign in</div>
      <h1 className={s.title}>
        Welcome <em>back.</em>
      </h1>
      <p className={s.desc}>Enter the number you get your prompts on and we'll text you a code.</p>
      <PhoneCodeForm
        createAccount={false}
        onVerified={() => navigate("/texts/account", { replace: true })}
      />
    </TextsShell>
  );
}
