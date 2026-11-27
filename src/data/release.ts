// The only module that reads the generated release data. Pages and the feed both import `release` from here,
// so they cannot disagree. An invalid generated file fails the build at import time.
import generated from "./release.generated.json";
import { validateReleaseData, type ReleaseData } from "../lib/release-data.ts";

export const release: ReleaseData = validateReleaseData(generated);
