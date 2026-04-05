export interface SkillContentPayload {
  content: string;
}

export interface RuntimeSettingsSnapshot {
  index_path: string;
  store_path: string;
  install_strategy: "symlink_first";
  registry_url: string;
}
