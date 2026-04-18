import { LayoutDashboard, Briefcase, Upload, LogOut, FileText } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Upload', url: '/upload', icon: Upload },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, user } = useAuth();
  const { role } = useUserRole();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm text-gradient leading-tight">Resume Screener</p>
              <p className="text-[10px] text-muted-foreground leading-tight">AI Recruiter Suite</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                {(user?.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{user?.email}</p>
                {role && <Badge variant="outline" className="capitalize text-[10px] h-4 px-1.5 mt-0.5">{role}</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="w-full rounded-lg">
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        )}
        {collapsed && (
          <Button variant="ghost" size="icon" onClick={signOut} className="mx-auto" title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
