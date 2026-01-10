import { ReactNode, useEffect, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "@/components/AppSidebar";
import { useNavigate } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();

  const [profilePic, setProfilePic] = useState<string>("");
  const [initials, setInitials] = useState<string>("AD");

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminProfile");
    navigate("/login");
  };

  // 🔥 Read profile image from localStorage
  useEffect(() => {
    const loadProfile = () => {
      const profile = localStorage.getItem("adminProfile");
      if (profile) {
        const parsed = JSON.parse(profile);

        setProfilePic(
          parsed.profilePicture || parsed.profilePic || ""
        );

        const first = parsed.firstName?.charAt(0) || "A";
        const last = parsed.lastName?.charAt(0) || "D";
        setInitials(`${first}${last}`);
      }
    };

    loadProfile();

    // 🔁 Listen for instant updates from profile page
    window.addEventListener("profile-updated", loadProfile);
    return () =>
      window.removeEventListener("profile-updated", loadProfile);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-white">
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-border bg-white px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer">
                    {profilePic ? (
                      <AvatarImage src={profilePic} alt="Admin" />
                    ) : (
                      <AvatarFallback>{initials}</AvatarFallback>
                    )}
                  </Avatar>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
