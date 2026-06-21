import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RideList } from "../Ride";
import { RideService } from '../ride.service';
import { ToastrService } from "ngx-toastr";
import { NotificationsService } from "../notifications.service";
import { AuthService } from "../auth.service";
import { FormGroup, FormControl, Validators } from "@angular/forms";


@Component({
  selector: 'app-report-issue',
  templateUrl: './report-issue.component.html',
  styleUrls: ['./report-issue.component.css']
})
export class ReportIssueComponent implements OnInit {
  user: any;
  rides: RideList[] | undefined;
  cardLoading: string = "";
  rideId: string | null = null;
  userId: string | null = null;;
  //selectedRideId: string | undefined;
  //selectedRide: any;
  issue: any = {
    description: '',
    category: 'Other',    
    priority: 'Low',
    issueDate: '',
    issueTime: '',   
    affectedPassengers: false,
    userID: this.userId,
  };
  issueForm = new FormGroup({   
    category: new FormControl("", Validators.required),
    description: new FormControl("", Validators.required),   
    priority: new FormControl("", Validators.required),
    issueDate: new FormControl("", Validators.required),
    issueTime: new FormControl("", Validators.required),
    affectedPassengers: new FormControl("", Validators.required),  
  });
  warning = "";
  success = false;
  loading = false;  
  submitted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rideService: RideService,
    private notificationService: NotificationsService,
    private toastr: ToastrService,
    private authService: AuthService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.user = this.authService.readToken();
    this.userId = this.user._id;
    this.route.paramMap.subscribe(params => {
      this.rideId = params.get('id');
    });
    
    let res: { message: String; _rides: [RideList] } | undefined =
    await this.rideService.getUserRides(this.user._id);
    this.rides = res?._rides;
    this.rides?.forEach((r) => {
      r.statusString = r.status.replace(/_/g, " ");
      r.exactTime = r?.dateTime
        ? new Date(r.dateTime).toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })
        : undefined;
      r.dateTime = r?.dateTime?.split("T")[0];     
    });
  }
  

  onSubmit(): void {
   if (this.issueForm.valid) {
    // Call the API to report the issue
    if (this.rideId !== null && this.user._id !== null) {
      this.issue.userID = this.user._id;
      this.rideService.reportIssue(this.rideId, this.issue, this.user._id).subscribe(
        () => {          
          this.toastr.success("Issue Reported!");
          this.submitted = true;
          const notificationData = {
            msg: "Your issue was reported successfully.",
            dateTime: Date.now(),
            category: "Ride",
          };
          this.notificationService
            .addNotification(this.user._id, notificationData)
            .subscribe(
              () => {
                this.warning = "";
                this.loading = false;
  
                this.authService.refreshToken().subscribe(
                  (refreshSuccess) => {
                    this.authService.setToken(refreshSuccess.token);
                    this.router.navigate(["/myRides"]);
                  },
                  (refreshError) => {
                    console.error("Error refreshing token:", refreshError);
                  }
                );
              },
              (notificationError) => {
                console.error("Error adding notification:", notificationError);
                this.warning = "Error adding notification";
                this.loading = false;
              }
            );    

          // Redirect back to the ride details page after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/myRides']);
          }, 3000);
        },
        (error) => {
          console.error('Error reporting issue:', error);
          this.toastr.warning('Fill out all the fields.');
          // Handle error, show error message, etc.
        }
      );
     }
   } else {
    this.issueForm.markAllAsTouched();
    this.toastr.warning('Fill out all the fields.');
   }
  }
}
