/* LOCKED - DO NOT MODIFY */
export type SidebarConfig = {
  width_collapsed: string;
  width_expanded: string;
  default_state: "collapsed" | "expanded";
  background: string;
  icon_size: string;
  active_color: string;
  text_visible: boolean;
};

export const SIDEBAR: SidebarConfig = {
  width_collapsed: "48px",
  width_expanded: "220px",
  default_state: "collapsed",
  background: "#0a0a0f",
  icon_size: "20px",
  active_color: "#20c997",
  text_visible: false,
};
