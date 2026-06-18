import type { Project } from '../model/types'
import type { SimResult } from './simulate'
import { zoneTempAt } from './simulate'

/**
 * Rule-based, plain-language cooling suggestions derived from the project and the
 * latest simulation. Deliberately heuristic — meant to guide intuition.
 */
export function coolingHints(project: Project, result: SimResult): string[] {
  const hints: string[] = []

  // Coolest outside zone and its night low.
  const zones = project.outsideZones
  const nightLow = (z: (typeof zones)[number]) =>
    z.diurnal ? z.diurnal.minC : z.tempC
  const coolest = [...zones].sort((a, b) => nightLow(a) - nightLow(b))[0]

  const warmestRoomStart = Math.max(...project.rooms.map((r) => r.initialTempC), -Infinity)

  if (coolest && warmestRoomStart > nightLow(coolest) + 1) {
    // Find the hour of the coolest outside temperature for a diurnal zone.
    if (coolest.diurnal) {
      const troughHour = (coolest.diurnal.peakHour + 12) % 24
      hints.push(
        `Outside is coolest around ${troughHour}:00 (${nightLow(coolest)}°C). Open windows overnight to flush heat, then close them before the afternoon peak.`,
      )
    } else {
      hints.push(
        `"${coolest.name}" stays at ${coolest.tempC}°C — open windows facing it to bring cooler air in.`,
      )
    }
  }

  // Cross-ventilation opportunities.
  for (const room of project.rooms) {
    const extOpenings = project.openings.filter((o) => {
      const w = project.walls.find((x) => x.id === o.wallId)
      return w?.exterior && touchesRoom(w, room.id)
    })
    if (extOpenings.length >= 2) {
      hints.push(
        `${room.name} has ${extOpenings.length} windows/doors to the outside — open openings on opposite sides together for cross-ventilation.`,
      )
    }
  }

  // Are any windows open onto the hot zone during peak heat?
  const hotZone = [...zones].sort(
    (a, b) => zoneTempAt(b, 16) - zoneTempAt(a, 16),
  )[0]
  if (hotZone && coolest && hotZone.id !== coolest.id) {
    hints.push(
      `During the hottest hours, keep openings onto "${hotZone.name}" closed and favour "${coolest.name}".`,
    )
  }

  // Score-based summary.
  const dh = result.degreeHoursAboveComfort
  if (dh < 1) {
    hints.push('This configuration keeps every room at or below the comfort temperature. 👍')
  } else {
    const worst = result.roomDegreeHours.indexOf(Math.max(...result.roomDegreeHours))
    hints.push(
      `Warmest room over the run: ${result.roomNames[worst]}. Lower the overall score by ventilating it more when outside is cooler.`,
    )
  }

  return hints
}

function touchesRoom(wall: Project['walls'][number], roomId: string): boolean {
  return (
    (wall.sideA.type === 'room' && wall.sideA.id === roomId) ||
    (wall.sideB.type === 'room' && wall.sideB.id === roomId)
  )
}
