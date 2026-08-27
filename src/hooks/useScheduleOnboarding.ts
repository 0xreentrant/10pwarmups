import { useCallback, useState } from "react"
import { SCHEDULE_ONBOARDING_VERSION } from "../data/scheduleOnboarding"
import {
  markScheduleOnboardingSeen,
  shouldShowScheduleOnboarding,
} from "../utils/scheduleOnboardingStorage"

export function useScheduleOnboarding(enabled = true) {
  const seen = !shouldShowScheduleOnboarding()
  const [dismissedIntro, setDismissedIntro] = useState(seen)
  const [demoComplete, setDemoComplete] = useState(seen)

  const completeIntro = useCallback(() => setDismissedIntro(true), [])

  const completeDemo = useCallback(() => {
    markScheduleOnboardingSeen(SCHEDULE_ONBOARDING_VERSION)
    setDemoComplete(true)
  }, [])

  const wantsOnboarding = enabled && !seen
  const introOpen = wantsOnboarding && !dismissedIntro
  const showDemo = wantsOnboarding && dismissedIntro && !demoComplete
  const active = introOpen || showDemo

  return { introOpen, showDemo, active, completeIntro, completeDemo }
}
