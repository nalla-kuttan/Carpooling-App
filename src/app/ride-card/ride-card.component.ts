import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Ride, StopLocation } from "../Ride";
import { RideService } from "../ride.service";
import { AuthService } from "../auth.service";
import { Router } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NotificationsService } from "../notifications.service";
import { StopLocationInfo } from "../rides/rides.component";

@Component({
  selector: "app-ride-card",
  styleUrls: ["./ride-card.component.css"],
  template: `
    <div class="card">
      <div class="card-header">
        <p *ngIf="userIsCreator" class="badge creator-badge"><b>Your Ride</b></p>
        <p class="destination-header"><b>Ride to:</b> {{ ride?.dropoffLocation?.name }}</p>
      </div>

      <div class="card-body" (click)="onRideClick()">
        <p class="body-address"><b>Destination:</b> {{ ride?.dropoffLocation?.address }}</p>
        <p class="body-capacity"><b>Capacity:</b> {{ riderCount }}/3</p>

        <div class="time-date">
          <label><b>Arrival Time:</b></label>
          <p>{{ this.timeStr }}</p>
          <label><b>Date:</b></label>
          <p>{{ rideDateStr }}</p>
        </div>
        
        <div *ngIf="useMatching" class="ic-container">
          <label *ngIf="interests.length < 1 && classes.length < 1" class="no-matches">No matching interests or classes</label>
          <div class="interests" *ngIf="interests.length > 0">
            <label><b>Matching Interests:</b></label>
            <p *ngFor="let interest of interests">{{ interest }}</p>
          </div>
          <div *ngIf="classes.length > 0" class="classes">
            <label><b>Matching Classes:</b></label>
            <p *ngFor="let classItem of classes">{{ classItem }}</p>
          </div>
        </div>

        <!-- Offer to Drive -->
        <div *ngIf="!userBecameDriver && !userIsDriver && needsDriver" class="btn-group">
          <button
            *ngIf="needsDriver && userCanDrive"
            (click)="onDriverNeededClick(); $event.stopPropagation()"
            [disabled]="userBecameDriver"
            class="mat-raised-button"
            color="primary"
          >
            Offer To Drive
          </button>
          <p class="warning" *ngIf="userIsRider"> This will switch you from rider to driver</p>
        </div>
        
        <!-- Cancel Drive Offer -->
        <button
          class="leave mat-raised-button"
          color="accent"
          *ngIf="(userIsDriver || userBecameDriver) && !userCancelledDriveOffer && !userIsCreator"
          (click)="onCancelDriveOfferClick(); $event.stopPropagation()"
          [disabled]="userCancelledDriveOffer || userIsCreator"
        >
          Cancel Drive Offer
        </button>

        <!-- Join Ride / Request to Join -->
        <div *ngIf="userCanJoin && roomAvailable && !userBecameRider && !userIsRider" class="btn-group">
          <button
            *ngIf="userIsPending"
            [disabled]="true"
            class="pending-button"
            (click)="$event.stopPropagation()"
          >
            <mat-icon style="margin-right: 4px; font-size: 16px; width: 16px; height: 16px; vertical-align: middle;">hourglass_empty</mat-icon>
            <span>Request Pending</span>
          </button>

          <button
            *ngIf="!userIsPending && !userIsDriver"
            (click)="onRequestJoinClick(); $event.stopPropagation()"
            [disabled]="!puLocation?.valid"
            class="mat-raised-button"
            color="primary"
          >
            <mat-icon style="margin-right: 4px; font-size: 16px; width: 16px; height: 16px; vertical-align: middle;">hail</mat-icon>
            <span>Request to Join</span>
          </button>

          <!-- Button for if user is driver -->
          <button
            *ngIf="!userIsPending && userIsDriver"
            (click)="onRequestJoinClick(); $event.stopPropagation()"
            [disabled]="!puLocation?.valid"
            class="mat-raised-button"
            color="primary"
          >
            Switch to Rider
          </button>

          <p *ngIf="!puLocation?.valid && !userIsPending" class="warning">Please enter a valid pickup location to request</p>
        </div>

        <!-- Leave Ride -->
        <button
          class="leave mat-raised-button"
          color="accent"
          *ngIf="(userIsRider && !userIsCreator && !userLeftRide) || userBecameRider && !userLeftRide && !userIsCreator"
          (click)="onLeaveRideClick(); $event.stopPropagation()"
        >
          Leave Ride
        </button>

        <!-- Pending Requests Queue for Driver/Creator -->
        <div 
          *ngIf="(userIsDriver || userIsCreator) && ride?.pendingRiders && ride.pendingRiders.length > 0" 
          class="pending-requests-section"
          (click)="$event.stopPropagation()"
        >
          <h4 class="section-title">Ride Requests ({{ ride.pendingRiders.length }})</h4>
          <div class="pending-rider-item" *ngFor="let req of ride.pendingRiders">
            <div class="rider-req-info">
              <span class="rider-req-name"><b>{{ req.username || req.riderId }}</b></span>
              <span class="rider-req-addr" *ngIf="req.pickupLocation?.address">{{ req.pickupLocation.address }}</span>
            </div>
            <div class="rider-req-actions">
              <button class="accept-btn" (click)="onAcceptRiderClick(req.riderId)" title="Accept Rider">
                <mat-icon>check</mat-icon>
              </button>
              <button class="decline-btn" (click)="onDeclineRiderClick(req.riderId)" title="Decline Rider">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class RideCardComponent implements OnInit {
  user: any;

  rideDate: Date | undefined;
  riderCount: number | undefined;
  needsDriver: boolean | undefined = true;
  roomAvailable: boolean = true;
  endLocation: StopLocation | undefined;
  endLocationMarker: { lat: number; lng: number } | undefined;

  // For determining button availability
  userCanJoin: boolean = true;
  userCanDrive: boolean = true;
  userIsDriver: boolean = false;
  userIsRider: boolean = false;
  userBecameRider: boolean = false;
  userBecameDriver: boolean = false;
  userLeftRide: boolean = false;
  userIsCreator: boolean = false;
  userCancelledDriveOffer: boolean = false;
  userIsPending: boolean = false;

  // For displaying information to the user
  rideDateStr: string | undefined;
  timeStr: string | undefined;

  // For holding rider/driver interests/classes
  interests: string[] = [];
  classes: string[] = [];

  @Input() ride: any;
  @Input() puLocation: StopLocationInfo | undefined;
  @Input() doLocation: StopLocationInfo | undefined;
  @Input() useMatching: boolean | undefined;
  @Output() newRideEvent = new EventEmitter<{ lat: number; lng: number }>();
  emitLocation() {
    this.newRideEvent.emit(this.endLocationMarker);
  }

  warning = "";
  success = false;
  loading = false;

  constructor(
    private rideService: RideService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private notificationService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.readToken();

    let dateTimeStr = this.ride?.dateTime;
    if (dateTimeStr) {
      this.rideDate = new Date(dateTimeStr);
    }
    
    // Setting date string for display
    var monthName: string | undefined;
    switch (this.rideDate?.getMonth()) {
      case 0: monthName = 'January'; break;
      case 1: monthName = 'February'; break;
      case 2: monthName = 'March'; break;
      case 3: monthName = 'April'; break;
      case 4: monthName = 'May'; break;
      case 5: monthName = 'June'; break;
      case 6: monthName = 'July'; break;
      case 7: monthName = 'August'; break;
      case 8: monthName = 'September'; break;
      case 9: monthName = 'October'; break;
      case 10: monthName = 'November'; break;
      case 11: monthName = 'December'; break;
      default: monthName = ''; break;
    }
    this.rideDateStr = `${this.rideDate?.getDate()} ${monthName}, ${this.rideDate?.getFullYear()}`;

    // Setting time string for display
    if (this.rideDate){
      let hour = this.rideDate?.getHours();
      let minute = this.rideDate?.getMinutes();
      let ampm = hour >= 12 ? 'pm' : 'am';
      hour = hour % 12;
      hour = hour ? hour : 12;

      // Formatting for 12hr clock
      if (hour < 10){
        this.timeStr = `0${hour}:`;
      } else {
        this.timeStr = `${hour}:`;
      }
      if (minute < 10){
        this.timeStr += `0${minute} ${ampm}`;
      } else {
        this.timeStr += `${minute} ${ampm}`;
      }
    }

    // Check if room is available to join, remove join button if not
    this.riderCount = this.ride?.riders?.length;
    if (this.riderCount) {
      if (this.riderCount >= 3) {
        this.roomAvailable = false;
      }
    }

    // Check if user is already involved in ride, no buttons if so
    if (this.ride?.riders) {
      for (const rider of this.ride?.riders) {
        if (rider.riderID === this.user._id) {
          this.userCanJoin = false;
          this.userIsRider = true;
        }
      }
    }

    // Check if user has a pending request
    if (this.ride?.pendingRiders) {
      for (const pr of this.ride?.pendingRiders) {
        if (pr.riderID === this.user._id || pr.riderId === this.user._id) {
          this.userIsPending = true;
          this.userCanJoin = true; // Still can join (show pending state instead of error warnings)
        }
      }
    }

    // Checks if ride has a driver
    if (this.ride?.driver) {
      this.needsDriver = false;

      if (this.ride?.driver === this.user._id) {
        this.userIsDriver = true;
      }
    }

    // Checks if user is creator of ride
    if (this.ride?.creator === this.user._id) {
      this.userIsCreator = true;
    }

    this.endLocation = this.ride?.dropoffLocation;
    this.endLocationMarker = this.endLocation?.location;

    this.setMatchValues();
  }

  setMatchValues() {
    if (this.ride?.riderInterests){
      this.interests = this.ride?.riderInterests;
      this.interests.sort();
    }
    if (this.ride?.riderClasses){
      this.classes = this.ride?.riderClasses;
      this.classes.sort();
    }
  }

  reInit() {
    this.ngOnInit();
  }

  onRideClick() {
    this.emitLocation();
  }

  // Request to Join flow
  onRequestJoinClick() {
    const pickupLocation = this.puLocation;

    this.rideService
      .requestJoinRide(this.ride?._id, this.user?._id, pickupLocation)
      .subscribe(
        (response) => {
          this.toastr.info("Join Request Sent");
          
          // Send notification to driver or creator
          const recipientID = this.ride.driver || this.ride.creator;
          if (recipientID) {
            const notificationData = {
              msg: `${this.user.username} requested to join your ride to ${this.ride?.dropoffLocation?.name}`,
              dateTime: Date.now(),
              category: "Ride",
            };
            this.notificationService
              .addNotification(recipientID, notificationData)
              .subscribe();
          }

          this.userIsPending = true;
          this.reInit();
        },
        (err) => {
          this.toastr.error("Error sending request");
        }
      );
  }

  // Accept applicant rider
  onAcceptRiderClick(riderId: string) {
    this.rideService.acceptRider(this.ride?._id, riderId).subscribe(
      (response) => {
        this.toastr.success("Ride Request Approved!");
        
        // Notify rider
        const notificationData = {
          msg: `Your request to join the ride to ${this.ride?.dropoffLocation?.name} was approved!`,
          dateTime: Date.now(),
          category: "Ride",
        };
        this.notificationService
          .addNotification(riderId, notificationData)
          .subscribe();

        // Refresh view
        this.router.navigate(["/router"]);
      },
      (err) => {
        this.toastr.error("Error accepting rider");
      }
    );
  }

  // Decline applicant rider
  onDeclineRiderClick(riderId: string) {
    this.rideService.declineRider(this.ride?._id, riderId).subscribe(
      (response) => {
        this.toastr.warning("Ride Request Declined");
        
        // Notify rider
        const notificationData = {
          msg: `Your request to join the ride to ${this.ride?.dropoffLocation?.name} was declined.`,
          dateTime: Date.now(),
          category: "Ride",
        };
        this.notificationService
          .addNotification(riderId, notificationData)
          .subscribe();

        // Refresh view
        this.router.navigate(["/router"]);
      },
      (err) => {
        this.toastr.error("Error declining rider");
      }
    );
  }

  // Add a rider directly to the ride
  onJoinRideClick() {
    const pickupLocation = this.puLocation;

    if (this.userIsDriver) {
      this.rideService.rmDriverFromRide(this.ride?._id).subscribe(
        (response) => {
          this.userIsDriver = false;
          this.userBecameDriver = false;
          this.needsDriver = true;
          this.userCanDrive = true;
        },
        (error) => {
          console.error("Error removing driver:", error);
        }
      );
    }

    this.rideService
      .registerRidertoRide(this.ride?._id, this.user?._id, pickupLocation)
      .subscribe(
        (response) => {
          this.toastr.success("Ride Joined");
          this.userBecameRider = true;
          this.userIsRider = true;
          this.userCanJoin = false;
          this.userLeftRide = false;
          this.riderCount = this.ride?.riders?.length;
        },
        (err) => {
          console.log("❗");
        }
      );
      
    this.reInit();
  }

  // Remove a rider from the ride
  onLeaveRideClick() {
    this.rideService.rmRiderFromRide(this.ride?._id, this.user?._id).subscribe(
      (response) => {
        this.toastr.error("Ride Abandoned");
        const notificationData = {
          msg: `You left the ride to ${this.ride?.dropoffLocation?.address}`,
          dateTime: Date.now(),
          category: "Ride",
        };
        this.notificationService
            .addNotification(this.user._id, notificationData)
            .subscribe();

        this.userLeftRide = true;
        this.userIsRider = false;
        this.userBecameRider = false;
        this.userCanJoin = true;
      },
      (err) => {
        console.log("❗");
      }
    );
    this.reInit();
  }

  // Add a driver to the ride
  onDriverNeededClick() {
    if (!this.userCanJoin) {
      this.rideService.rmRiderFromRide(this.ride?._id, this.user?._id).subscribe(
        (response) => {
          this.userIsRider = false;
          this.userBecameRider = false;
          this.userCanJoin = true;
        },
        (error) => {
          console.error("Error removing rider:", error);
        }
      );
    }

    this.rideService
      .registerDriverToRide(this.ride?._id, this.user?._id)
      .subscribe(
        (response) => {
          this.toastr.success("Get Ready to Drive");
          this.userBecameDriver = true;
          this.needsDriver = false;
          this.userIsDriver = true;
          this.userCancelledDriveOffer = false;
        },
        (err) => {
          console.log("❗");
        }
      );

    this.reInit();
  }

  // Remove driver from ride (Cancel Drive Offer)
  onCancelDriveOfferClick() {
    this.rideService.rmDriverFromRide(this.ride?._id).subscribe(
      (response) => {
        this.toastr.error("Drive Offer Cancelled");
        this.userCancelledDriveOffer = true;
        this.needsDriver = true;
        this.userIsDriver = false;
        this.userBecameDriver = false;

        if (this.userIsCreator) {
          this.rideService
            .registerRidertoRide(this.ride?._id, this.user?._id, this.puLocation)
            .subscribe(
              (res) => {
                this.userBecameRider = true;
                this.userIsRider = true;
              }
            );
        }    
      },
      (err) => {
        console.log("❗");
      }
    );

    this.reInit();
  }
}
