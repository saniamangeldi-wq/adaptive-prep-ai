import { create } from "zustand";
import { SIDEBAR } from "@/lib/design-system";

type SidebarDefaultState = typeof SIDEBAR.default_state;

interface SidebarStore {
  isExpanded: boolean;
  toggleSidebar: () => void;
  setExpanded: (expanded: boolean) => void;
  resetSidebar: () => void;
}

const isExpandedByDefault = (defaultState: SidebarDefaultState) => defaultState === "expanded";

export const useSidebarStore = create<SidebarStore>((set) => ({
  isExpanded: isExpandedByDefault(SIDEBAR.default_state),
  toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  resetSidebar: () => set({ isExpanded: isExpandedByDefault(SIDEBAR.default_state) }),
}));
