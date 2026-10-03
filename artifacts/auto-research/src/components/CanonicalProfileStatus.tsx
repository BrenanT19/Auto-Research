import type { VehicleSummary } from "@workspace/api-client-react";

export function CanonicalProfileStatus({
  vehicle,
  explain = false,
}: {
  vehicle: Pick<VehicleSummary, "profileKind" | "isDemo" | "publicationStatus">;
  explain?: boolean;
}) {
  if (vehicle.profileKind !== "canonical" || vehicle.isDemo) return null;
  const preview = vehicle.publicationStatus === "development_preview";
  return <div className="canonical-profile-status">
    <span>Real research profile{preview ? " · Development preview" :
      vehicle.publicationStatus === "publicly_released" ? " · Published" : ""}</span>
    {explain && preview && <p>
      This profile is visible only in development and is not publicly released.
      Missing research is not replaced with demo estimates.
    </p>}
  </div>;
}