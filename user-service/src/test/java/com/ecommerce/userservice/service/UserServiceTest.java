package com.ecommerce.userservice.service;

import com.ecommerce.userservice.dto.AuthResponseDto;
import com.ecommerce.userservice.dto.LoginRequestDto;
import com.ecommerce.userservice.dto.UserRegistrationDto;
import com.ecommerce.userservice.model.User;
import com.ecommerce.userservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UserRegistrationDto registrationDto;
    private LoginRequestDto loginDto;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setPhoneNumber("+91-9876543210");
        testUser.setEnabled(true);

        registrationDto = new UserRegistrationDto();
        registrationDto.setUsername("newuser");
        registrationDto.setEmail("new@example.com");
        registrationDto.setPassword("password123");
        registrationDto.setFirstName("New");
        registrationDto.setLastName("User");
        registrationDto.setPhoneNumber("+91-9876543211");

        loginDto = new LoginRequestDto();
        loginDto.setUsername("test@example.com");
        loginDto.setPassword("password123");
    }

    @Test
    void registerUser_Success() {
        // Given
        when(userRepository.existsByEmail(registrationDto.getEmail())).thenReturn(false);
        when(userRepository.existsByUsername(registrationDto.getUsername())).thenReturn(false);
        when(passwordEncoder.encode(registrationDto.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");

        // When
        AuthResponseDto result = userService.registerUser(registrationDto);

        // Then
        assertNotNull(result);
        assertEquals("jwt-token", result.getToken());
        assertEquals(testUser.getId(), result.getUserId());
        assertEquals(testUser.getUsername(), result.getUsername());
        assertEquals(testUser.getEmail(), result.getEmail());

        verify(userRepository).existsByEmail(registrationDto.getEmail());
        verify(userRepository).existsByUsername(registrationDto.getUsername());
        verify(passwordEncoder).encode(registrationDto.getPassword());
        verify(userRepository).save(any(User.class));
        verify(jwtService).generateToken(any(User.class));
    }

    @Test
    void registerUser_EmailAlreadyExists() {
        // Given
        when(userRepository.existsByEmail(registrationDto.getEmail())).thenReturn(true);

        // When & Then
        assertThrows(RuntimeException.class, () -> userService.registerUser(registrationDto));
        verify(userRepository).existsByEmail(registrationDto.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerUser_UsernameAlreadyExists() {
        // Given
        when(userRepository.existsByEmail(registrationDto.getEmail())).thenReturn(false);
        when(userRepository.existsByUsername(registrationDto.getUsername())).thenReturn(true);

        // When & Then
        assertThrows(RuntimeException.class, () -> userService.registerUser(registrationDto));
        verify(userRepository).existsByEmail(registrationDto.getEmail());
        verify(userRepository).existsByUsername(registrationDto.getUsername());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void loginUser_Success() {
        // Given
        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(userRepository.findByUsername(loginDto.getUsername())).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

        // When
        AuthResponseDto result = userService.loginUser(loginDto);

        // Then
        assertNotNull(result);
        assertEquals("jwt-token", result.getToken());
        assertEquals(testUser.getId(), result.getUserId());
        assertEquals(testUser.getUsername(), result.getUsername());
        assertEquals(testUser.getEmail(), result.getEmail());

        verify(authenticationManager).authenticate(any());
        verify(userRepository).findByUsername(loginDto.getUsername());
        verify(jwtService).generateToken(any(UserDetails.class));
    }

    @Test
    void loginUser_UserNotFound() {
        // Given
        when(authenticationManager.authenticate(any())).thenThrow(new RuntimeException("User not found"));

        // When & Then
        assertThrows(RuntimeException.class, () -> userService.loginUser(loginDto));
        verify(authenticationManager).authenticate(any());
    }

    @Test
    void loginUser_InvalidPassword() {
        // Given
        when(authenticationManager.authenticate(any())).thenThrow(new RuntimeException("Invalid credentials"));

        // When & Then
        assertThrows(RuntimeException.class, () -> userService.loginUser(loginDto));
        verify(authenticationManager).authenticate(any());
    }

    @Test
    void getUserById_Success() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // When
        User result = userService.getUserById(1L);

        // Then
        assertNotNull(result);
        assertEquals(testUser.getId(), result.getId());
        assertEquals(testUser.getUsername(), result.getUsername());
        assertEquals(testUser.getEmail(), result.getEmail());

        verify(userRepository).findById(1L);
    }

    @Test
    void getUserById_NotFound() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> userService.getUserById(1L));
        verify(userRepository).findById(1L);
    }

    @Test
    void updateUserProfile_Success() {
        // Given
        UserRegistrationDto updateDto = new UserRegistrationDto();
        updateDto.setFirstName("Updated");
        updateDto.setLastName("User");
        updateDto.setPhoneNumber("+91-9876543212");

        User updatedUser = new User();
        updatedUser.setId(1L);
        updatedUser.setUsername("testuser");
        updatedUser.setEmail("test@example.com");
        updatedUser.setFirstName("Updated");
        updatedUser.setLastName("User");
        updatedUser.setPhoneNumber("+91-9876543212");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        // When
        User result = userService.updateUserProfile(1L, updateDto);

        // Then
        assertNotNull(result);
        assertEquals(updateDto.getFirstName(), result.getFirstName());
        assertEquals(updateDto.getLastName(), result.getLastName());
        assertEquals(updateDto.getPhoneNumber(), result.getPhoneNumber());

        verify(userRepository).findById(1L);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void updateUserProfile_UserNotFound() {
        // Given
        UserRegistrationDto updateDto = new UserRegistrationDto();
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(RuntimeException.class, () -> userService.updateUserProfile(1L, updateDto));
        verify(userRepository).findById(1L);
        verify(userRepository, never()).save(any(User.class));
    }



    @Test
    void validateToken_Success() {
        // Given
        String token = "valid-token";
        when(jwtService.validateToken(token)).thenReturn(true);

        // When
        boolean result = userService.validateToken(token);

        // Then
        assertTrue(result);
        verify(jwtService).validateToken(token);
    }

    @Test
    void validateToken_InvalidToken() {
        // Given
        String token = "invalid-token";
        when(jwtService.validateToken(token)).thenReturn(false);

        // When
        boolean result = userService.validateToken(token);

        // Then
        assertFalse(result);
        verify(jwtService).validateToken(token);
    }
} 