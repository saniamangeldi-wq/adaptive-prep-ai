import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { History, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, PenLine, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConversationSidebar } from "@/components/ai/ConversationSidebar";
import { AccountMenu } from "./AccountMenu";
import { NEW_CHAT_EVENT } from "./events";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Path prefix that also marks this item as current. */
  matchPrefix?: string;
};

const NAVIGATION: NavItem[] = [
  { label: "Chat", href: "/dashboard", icon: MessageSquare },
  { label: "Check an essay", href: "/dashboard/writing", icon: PenLine, matchPrefix: "/dashboard/writing" },
  { label: "History", href: "/dashboard/history", icon: History, matchPrefix: "/dashboard/history" },
];

const COLLAPSED_KEY = "adaptiveprep:sidebar-collapsed";
const WIDTH_EXPANDED = "16.5rem";
const WIDTH_COLLAPSED = "3.75rem";


interface DashboardLayoutProps {
  children: React.ReactNode;
  /**
   * The page fills the viewport and scrolls inside itself (the chat). Other pages
   * scroll with the document.
   */
  flush?: boolean;
  /** Short title for the phone top bar. Defaults to the logo. */
  title?: string;
}

function useCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const set = useCallback((v: boolean) => {
    setCollapsed(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [collapsed, set];
}

/**
 * The signed-in shell: a sidebar with new chat, the three destinations, recent chats
 * and the account menu. Collapsible to a rail on desktop; a drawer on phones.
 */
export function DashboardLayout({ children, flush = false, title }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useCollapsed();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const path = location.pathname.replace(/\/+$/, "") || "/";
  const onChat = path === "/dashboard" || path === "/dashboard/coach";
  const currentConversationId = onChat ? searchParams.get("c") : null;

  // Close the drawer whenever the page changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  const isActive = (item: NavItem) => {
    if (item.href === "/dashboard") return onChat;
    return item.matchPrefix ? path === item.matchPrefix || path.startsWith(`${item.matchPrefix}/`) : path === item.href;
  };

  const startNewChat = () => {
    setDrawerOpen(false);
    window.dispatchEvent(new CustomEvent(NEW_CHAT_EVENT));
    if (!(onChat && !location.search)) navigate("/dashboard");
  };

  const onConversationDeleted = (conv: { id: string }) => {
    if (conv.id === currentConversationId) startNewChat();
  };

  const sidebarWidth = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

  return (
    <div className="min-h-dvh bg-background" style={{ ["--sidebar-w" as string]: sidebarWidth }}>
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className="fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200"
        style={{ width: sidebarWidth }}
      >
        {collapsed ? (
          <CollapsedRail
            items={NAVIGATION}
            isActive={isActive}
            onExpand={() => setCollapsed(false)}
            onNewChat={startNewChat}
          />
        ) : (
          <SidebarBody
            isActive={isActive}
            currentConversationId={currentConversationId}
            onNewChat={startNewChat}
            onConversationDeleted={onConversationDeleted}
            headerAction={
              <SidebarIconButton label="Collapse sidebar" onClick={() => setCollapsed(true)}>
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
              </SidebarIconButton>
            }
          />
        )}
      </aside>

      {/* Phone drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[18.5rem] max-w-[85vw] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col gap-0 [&>button]:top-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarBody
            isActive={isActive}
            currentConversationId={currentConversationId}
            onNewChat={startNewChat}
            onConversationDeleted={onConversationDeleted}
            onNavigate={() => setDrawerOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="md:pl-[var(--sidebar-w)] transition-[padding] duration-200">
        {/* Phone top bar */}
        <header className="md:hidden sticky top-0 z-30 h-14 flex items-center gap-1 px-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="h-10 w-10 flex items-center justify-center rounded-lg text-foreground hover:bg-accent"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0 px-1">
            {title ? (
              <p className="truncate text-[15px] font-medium text-foreground">{title}</p>
            ) : (
              <Link to="/dashboard" aria-label="AdaptivePrep, new chat" className="inline-flex">
                <Logo markClassName="h-7 w-7" />
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={startNewChat}
            aria-label="New chat"
            className="h-10 w-10 flex items-center justify-center rounded-lg text-foreground hover:bg-accent"
          >
            <SquarePen className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <main
          className={cn(
            flush
              ? "flex flex-col h-[calc(100dvh-3.5rem)] md:h-dvh"
              : "px-4 py-5 sm:px-6 lg:px-10 lg:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarBody({
  isActive,
  currentConversationId,
  onNewChat,
  onConversationDeleted,
  onNavigate,
  headerAction,
}: {
  isActive: (item: NavItem) => boolean;
  currentConversationId: string | null;
  onNewChat: () => void;
  onConversationDeleted: (conv: { id: string }) => void;
  onNavigate?: () => void;
  headerAction?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex h-14 items-center justify-between gap-2 pl-4 pr-2 flex-shrink-0">
        <Link to="/dashboard" onClick={onNavigate} aria-label="AdaptivePrep, new chat" className="rounded-md">
          <Logo markClassName="h-7 w-7" />
        </Link>
        {headerAction}
      </div>

      <div className="px-3 pb-2 flex-shrink-0">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full h-10 items-center gap-2.5 rounded-lg border border-sidebar-border bg-card px-3 text-sm font-medium text-foreground shadow-card transition-colors hover:bg-accent"
        >
          <SquarePen className="h-4 w-4 text-primary" aria-hidden="true" />
          New chat
        </button>
      </div>

      <nav aria-label="Main" className="px-3 pb-3 flex-shrink-0">
        <ul className="space-y-px">
          {NAVIGATION.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-primary" : "text-[hsl(var(--sidebar-icon-muted))]")} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-3 border-t border-sidebar-border flex-shrink-0" />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
        <ConversationSidebar currentConversationId={currentConversationId} onDeleted={onConversationDeleted} onOpen={onNavigate} />
      </div>

      <div className="border-t border-sidebar-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex-shrink-0">
        <AccountMenu onNavigate={onNavigate} />
      </div>
    </>
  );
}

function CollapsedRail({
  items,
  isActive,
  onExpand,
  onNewChat,
}: {
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  onExpand: () => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center gap-1 py-3">
      <Link to="/dashboard" aria-label="AdaptivePrep, new chat" className="mb-1 rounded-md">
        <LogoMark className="h-7 w-7" />
      </Link>
      <SidebarIconButton label="Expand sidebar" onClick={onExpand}>
        <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
      </SidebarIconButton>
      <SidebarIconButton label="New chat" onClick={onNewChat}>
        <SquarePen className="h-[18px] w-[18px]" aria-hidden="true" />
      </SidebarIconButton>
      <div className="my-1 h-px w-6 bg-sidebar-border" />
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Tooltip key={item.href} delayDuration={300}>
            <TooltipTrigger asChild>
              <Link
                to={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-lg transition-colors",
                  active ? "bg-sidebar-accent text-primary" : "text-[hsl(var(--sidebar-icon-muted))] hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
      <div className="flex-1" />
      <AccountMenu compact />
    </div>
  );
}
