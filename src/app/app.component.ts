import { Component, OnInit, HostListener } from "@angular/core";
import { Router, Event, NavigationStart } from "@angular/router";
import { AuthService } from "./auth.service";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { NotificationsService } from "./notifications.service";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit {
  title = "web422-a4";
  public token: any | undefined;
  user: any;
  highlightedNotification: number | null = null;
  faBell = faBell;
  faTimes = faTimes;
  fnotifs: string[] = this.notificationsService.notifications; // Array to store notifications
  hnn = this.notificationsService.hasNewNotification;  
  showNotifications = false;
  isDarkMode = false;

  constructor(
    private router: Router,
    private aservice: AuthService,
    public notificationsService: NotificationsService
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(["/login"]);
  }

  toggleNotifications() {
  
    this.showNotifications = !this.showNotifications;
   
    //console.log(this.hnn);
    if (this.showNotifications && this.notificationsService.hasNewNotification) {
      // User clicked on the bell icon, highlight the first notification
      const firstNotificationIndex = this.fnotifs.length - 1; // Index of the first notification (most recently added)
      this.highlightedNotification = firstNotificationIndex;

      // Remove the highlight after 2 seconds
      setTimeout(() => {
        this.highlightedNotification = null;
      }, 2000);
    }
     this.notificationsService.hasNewNotification = false;
  }

  removeNotification(notificationId: string) {
    console.log(
      "Remove Notification Function from app.component.ts was accessed."
    );
    const userId = this.token._id;
    this.notificationsService
      .removeNotification(userId, notificationId)
      .subscribe(
        (response) => {
          console.log("notification should be removed now.");
          // Notification removed successfully
          this.aservice.refreshToken().subscribe(
            (refreshSuccess) => {
              this.aservice.setToken(refreshSuccess.token);
            },
            (refreshError) => {
              console.error("Error refreshing token:", refreshError);
            }
          );
          const index = this.fnotifs.indexOf(notificationId);
          console.log(index);
          if (index !== -1) {
            this.fnotifs.splice(index, 1);
          }
          this.hnn = false;
          console.log("checking" + this.fnotifs);
        },
        (error) => {
          // Error occurred while removing notification
          console.error("Error removing notification:", error);
        }
      );
  }

  clearNotifications() {
    const userId = this.token._id;
    this.notificationsService.clearNotifications(userId).subscribe(
      (response) => {
        // Notifications cleared successfully
        this.fnotifs = [];
        this.hnn = false;
        this.aservice.refreshToken().subscribe(
          (refreshSuccess) => {
            this.aservice.setToken(refreshSuccess.token);
          },
          (refreshError) => {
            console.error("Error refreshing token:", refreshError);
          }
        );
      },
      (error) => {
        // Error occurred while clearing notifications
        console.error("Error clearing notifications:", error);
      }
    );
  }
 

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".notification-icon")) {
      this.showNotifications = false;
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }

  ngOnInit(): void {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      this.isDarkMode = true;
      document.body.classList.add("dark-theme");
    } else {
      this.isDarkMode = false;
      document.body.classList.remove("dark-theme");
    }

    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {    
        
        this.token = this.aservice.readToken();
        if (this.token) {
          this.fnotifs = this.token.notifications.map(
            (notification: any) => notification.msg
          );
        } else {
          this.fnotifs = [];
        }
      }
    });
  }
}
