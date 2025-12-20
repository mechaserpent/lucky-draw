import { computed } from "vue";

export function useAppVersion() {
  const config = useRuntimeConfig();
  const version = computed(() => config.public.appVersion || "0.0.0");
  const buildNumber = computed(() => config.public.buildNumber || "");
  const buildTimestamp = computed(() => config.public.buildTimestamp || "");

  const buildLabel = computed(() => {
    if (buildNumber.value) return buildNumber.value;
    if (buildTimestamp.value) {
      const date = new Date(buildTimestamp.value);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
      return buildTimestamp.value;
    }
    return "dev";
  });

  const buildDate = computed(() => {
    if (!buildTimestamp.value) return "";
    const date = new Date(buildTimestamp.value);
    if (Number.isNaN(date.getTime())) return buildTimestamp.value;
    return date.toLocaleString();
  });

  return {
    version,
    buildNumber,
    buildTimestamp,
    buildLabel,
    buildDate,
  };
}
