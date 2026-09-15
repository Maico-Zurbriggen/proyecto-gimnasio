/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Identidades de desarrollo por rol (headers `x-user-*`) mientras no exista login. */
  readonly VITE_DEV_STUDENT_ID?: string;
  readonly VITE_DEV_TRAINER_ID?: string;
  readonly VITE_DEV_ADMIN_ID?: string;
  readonly VITE_DEV_GYM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
