export function officeNavigation(state, roomId, reveal = true) {
  const target = roomId === undefined ? state.officeRoomId ?? null : roomId
  if (!reveal && !state.office) return { ...state, officeRoomId: target }
  return { ...state, office: { roomId: target }, officeRoomId: target, newChat: null, exchange: null, menu: null, palette: null, details: null, settings: null }
}
