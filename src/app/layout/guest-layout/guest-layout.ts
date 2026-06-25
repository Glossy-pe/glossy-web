import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './components/nav-bar/nav-bar';
import { SideBar } from './components/side-bar/side-bar';

@Component({
  selector: 'app-guest-layout',
  standalone: true,
  imports: [RouterOutlet, NavBar, SideBar],
  templateUrl: './guest-layout.html',
  styleUrl: './guest-layout.scss',
})
export class GuestLayout {}