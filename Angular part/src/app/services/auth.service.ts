import { Injectable, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SignupRequestPayload } from 'src/app/components/auth/signup/signup-request.payload';
import { Observable, throwError } from 'rxjs';
import { LoginRequestPayload } from '../components/auth/login/login-request.payload';
import { LoginResponse } from '../components/auth/login/login-response.payload';
import { LocalStorageService } from 'ngx-webstorage';

import { pipe } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ReturnStatement } from '@angular/compiler';
import { EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // We are emitting two values from this class
  @Output() loggedIn: EventEmitter<boolean> = new EventEmitter();
  @Output() username: EventEmitter<string> = new EventEmitter();
  @Output() isAdmin: EventEmitter<boolean> = new EventEmitter();

  refreshTokenPayload = {
    refreshToken: this.getRefreshToken(),
    username: this.getUsername()
  }

  constructor(private httpClient: HttpClient, private localStorage: LocalStorageService) {
  }

  signup(signupRequestPayload: SignupRequestPayload): Observable<any> {
    return this.httpClient.post("http://localhost:8090/api/auth/signup", signupRequestPayload, {responseType: 'text'});
  }

  login(loginRequestPayload: LoginRequestPayload): Observable<boolean> {

    if(loginRequestPayload.username === 'admin' && 
      loginRequestPayload.username === loginRequestPayload.password) {
      this.isAdmin.emit(true);
    }

    return this.httpClient.post<LoginResponse>("http://localhost:8090/api/auth/login",
     loginRequestPayload).pipe(map(data => {
      this.localStorage.store('authenticationToken', data.authenticationToken);
      this.localStorage.store('username', data.username);
      this.localStorage.store('refreshToken', data.refreshToken);
      this.localStorage.store('expiresAt', data.expiresAt);

      // emit the username and isLoggedIn so that header component can use it
      this.loggedIn.emit(true);
      this.username.emit(data.username);

      return true;
    }));

  }

  getJwtToken() {
    return this.localStorage.retrieve('authenticationToken');
  }

  refreshToken() {
    return this.httpClient.post<LoginResponse>('http://localhost:8090/api/auth/refresh/token', 
      this.refreshTokenPayload).pipe(tap(response => {
        // Clear the expired details
        this.localStorage.clear('authenticationToken');
        this.localStorage.clear('expiresAt');

        // Store the new details
        this.localStorage.store('authenticationToken', response.authenticationToken);
        this.localStorage.store('expiresAt', response.expiresAt);
      }))
  }
  getUsername() {
    return this.localStorage.retrieve('username');
  }
  getRefreshToken() {
    return this.localStorage.retrieve('refreshToken');
  }

  isLoggedIn(): boolean {
    return this.getJwtToken() != null;
  }

  logout() {
    this.httpClient.post('http://localhost:8090/api/auth/logout', this.refreshTokenPayload,
     {responseType: 'text'})
     .subscribe(data => {
       console.log(data);
     }, error => {
       throwError(error);
     })
     // clear the local storage also
      this.localStorage.clear('authenticationToken');
      this.localStorage.clear('expiresAt');
      this.localStorage.clear('username');
      this.localStorage.clear('refreshToken');
  }

}
