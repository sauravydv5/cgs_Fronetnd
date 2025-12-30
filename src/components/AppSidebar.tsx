import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  Users,
  FileText,
  ShoppingBag,
  BookOpen,
  BarChart3,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Product Management", href: "/products", icon: Package },
  { name: "Order Management", href: "/orders", icon: ShoppingCart },
  { name: "Inventory Tracking", href: "/inventory", icon: Boxes },
  { name: "Customer Relationship", href: "/customers", icon: Users },
  { name: "Bill Generation", href: "/bills", icon: FileText },
  { name: "Purchases", href: "/purchases", icon: ShoppingBag },
  { name: "Ledger", href: "/ledger", icon: BookOpen },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className="border-r-0 bg-gradient-sidebar" collapsible="icon">
      <SidebarContent className="px-3 py-6 flex flex-col items-center">
        {/* ---- Logo ---- */}
        <div
          className={cn(
            "mb-10 w-full flex justify-center transition-all duration-300"
          )}
        >
          <h1
            className="text-sidebar-foreground font-['Montserrat'] transition-all duration-300"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 600,
              fontSize: open ? "42px" : "36px",
              lineHeight: "40px",
            }}
          >
            {open ? "CGS" : "C"}
          </h1>
        </div>

        {/* ---- Menu ---- */}
        <SidebarGroup className="border-0 w-full">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.name}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink 
                            to={item.href}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-3 px-3 transition-all duration-300",
                                isActive
                                  ? "bg-white text-sidebar-foreground shadow-sm"
                                  : "text-sidebar-foreground hover:bg-white"
                              )
                            }
                          >
                            <div className="flex flex-row gap-2 hover:bg-[#FFFFFF] rounded-[20px] ">
                            <Icon size={27} className="flex-shrink-0" />
                            {open && (
                              <span className="text-[20px] font-bold leading-none">
                                {item.name}
                              </span>
                            )}
                            </div>
                            
                          </NavLink>
                        </TooltipTrigger>

                        {/* Tooltip with custom color */}
                        {!open && (
                          <TooltipContent
                            side="right"
                            className="text-sm font-medium text-sidebar-foreground rounded-md shadow-md"
                            style={{
                              backgroundColor: "#F0D8B9",
                              color: "#000000",
                            }}
                          >
                            {item.name}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
