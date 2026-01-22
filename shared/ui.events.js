






// ==== ui.events.js ====


export const NavigationEvents = {
  NAVIGATE_MAIN_MENU: 'nav:main_menu',
  NAVIGATE_SINGLE_PLAYER_MENU: 'nav:single_player_menu',
  NAVIGATE_CREATE_LOBBY: 'nav:create_lobby',
  NAVIGATE_JOIN_LOBBY: 'nav:join_lobby',
  NAVIGATE_HOST_LOBBY: 'nav:host_lobby',
  NAVIGATE_PARTICIPANT_LOBBY: 'nav:participant_lobby',
  NAVIGATE_GAME: 'nav:game',
  NAVIGATE_BACK: 'nav:back',
}


export const UIEvents = {
  CLICK_SINGLE_PLAYER_MENU: 'ui:click_single_player_menu',
  CLICK_SINGLE_PLAYER_START: 'ui:click_single_player_start',

  CLICK_CREATE_LOBBY_MENU: 'ui:click_create_lobby_menu',
  CLICK_CREATE_LOBBY_CONFIRM: 'ui:click_create_lobby_confirm',

  CLICK_JOIN_LOBBY_MENU: 'ui:click_join_lobby_menu',
  CLICK_JOIN_LOBBY_CONFIRM: 'ui:click_join_lobby_confirm',

  CLICK_START_GAME: 'ui:click_start_game',
  CLICK_LEAVE_LOBBY: 'ui:click_leave_lobby',

  SOCKET_DISCONNECTED: 'ui:socket_disconnected',
}
