package com.ecommerce.userservice.controller;

import com.ecommerce.userservice.dto.AuthResponseDto;
import com.ecommerce.userservice.dto.LoginRequestDto;
import com.ecommerce.userservice.dto.UserRegistrationDto;
import com.ecommerce.userservice.model.User;
import com.ecommerce.userservice.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> registerUser(@Valid @RequestBody UserRegistrationDto registrationDto) {
        try {
            AuthResponseDto response = userService.registerUser(registrationDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            throw new RuntimeException("Registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> loginUser(@Valid @RequestBody LoginRequestDto loginRequest) {
        try {
            AuthResponseDto response = userService.loginUser(loginRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            throw new RuntimeException("Login failed: " + e.getMessage());
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<User> getUserProfile(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String username = userService.getUsernameFromToken(jwtToken);
            User user = userService.getUserByUsername(username);
            
            // Don't return password
            user.setPassword(null);
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get user profile: " + e.getMessage());
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateUserProfile(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody UserRegistrationDto updateDto) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String username = userService.getUsernameFromToken(jwtToken);
            User user = userService.getUserByUsername(username);
            
            User updatedUser = userService.updateUserProfile(user.getId(), updateDto);
            updatedUser.setPassword(null);
            
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update user profile: " + e.getMessage());
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            boolean isValid = userService.validateToken(jwtToken);
            
            Map<String, Object> response = new HashMap<>();
            response.put("valid", isValid);
            
            if (isValid) {
                String username = userService.getUsernameFromToken(jwtToken);
                User user = userService.getUserByUsername(username);
                response.put("userId", user.getId());
                response.put("username", user.getUsername());
                response.put("role", user.getRole().name());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("valid", false);
            response.put("error", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<User> getUserById(@PathVariable Long userId) {
        try {
            User user = userService.getUserById(userId);
            user.setPassword(null);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            throw new RuntimeException("User not found: " + e.getMessage());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "User Service");
        return ResponseEntity.ok(response);
    }
} 