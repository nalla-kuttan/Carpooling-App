import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

declare const google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnChanges {

  map: any;
  directionsService: any;
  directionsRenderer: any;

  @Input() pinLocation: { lat: number, lng: number } | undefined;
  @Input() pickupLocation: any;
  @Input() dropoffLocation: any;

  constructor(private router: Router) {}

  ngOnInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pickupLocation'] || changes['dropoffLocation']) {
      this.renderRoute();
    } else if (changes['pinLocation']) {
      this.reInit();
    }
  }

  // Called when a user selects a ride to add pin
  async reInit() {
    if (this.pinLocation) {
      const pin = new google.maps.Marker({
        map: this.map,
        position: this.pinLocation
      });
      
      // If we also have a pickup location, render the route between the pickup and selected dropoff
      if (this.pickupLocation?.location) {
        this.renderRouteWithPin();
      } else {
        this.initMap(pin);
      }
    }
  }

  async initMap(pin: any = null): Promise<void> {
    const senecaNewnham = { lat: 43.79597128985944, lng: -79.34858107406576 };

    this.map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
      center: pin == null ? senecaNewnham : pin.getPosition(),
      zoom: 14,
    });

    if (pin != null) {
      pin.setMap(this.map);
    }
  }

  // Draw route between searched pickup point and selected ride dropoff point
  async renderRouteWithPin() {
    if (!this.pickupLocation?.location || !this.pinLocation) {
      return;
    }

    if (!this.map) {
      await this.initMap();
    }

    this.setupDirections();

    const request = {
      origin: this.pickupLocation.location,
      destination: this.pinLocation,
      travelMode: google.maps.TravelMode.DRIVING
    };

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed due to ' + status);
      }
    });
  }

  // Draw route from pickupLocation to dropoffLocation inputs
  async renderRoute() {
    if (!this.pickupLocation?.location || !this.dropoffLocation?.location) {
      return;
    }

    if (!this.map) {
      await this.initMap();
    }

    this.setupDirections();

    const request = {
      origin: this.pickupLocation.location,
      destination: this.dropoffLocation.location,
      travelMode: google.maps.TravelMode.DRIVING
    };

    this.directionsService.route(request, (result: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Directions request failed due to ' + status);
      }
    });
  }

  private setupDirections() {
    if (!this.directionsService) {
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: '#0d9488', // Teal 600
          strokeOpacity: 0.85,
          strokeWeight: 6
        }
      });
    }
    this.directionsRenderer.setMap(this.map);
  }
}