function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get sessionSecret(): string {
    return required("SESSION_SECRET");
  },
  get adminUsername(): string {
    return required("ADMIN_USERNAME");
  },
  get adminPassword(): string {
    return required("ADMIN_PASSWORD");
  },
};
