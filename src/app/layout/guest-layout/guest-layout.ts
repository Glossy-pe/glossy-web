import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { SideBar } from './components/side-bar/side-bar';
import { Snow } from './components/camaign/snow';
import { ChristmasWelcome } from './components/camaign/christmas-welcome';

@Component({
  selector: 'app-guest-layout',
  standalone: true,
  imports: [RouterOutlet, NavBar, SideBar, Snow, ChristmasWelcome],
  templateUrl: './guest-layout.html',
  styleUrl: './guest-layout.scss',
})
export class GuestLayout {}