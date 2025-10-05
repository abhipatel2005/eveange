# Registration System Migration Plan

## ✅ Completed Tasks

### Phase 1: Unified Registration

- [x] Updated shared schemas to default to "participant" role
- [x] Simplified registration form to remove role selection
- [x] Removed organization name and phone number from initial registration
- [x] Updated backend auth controller to handle simplified registration
- [x] Updated frontend API interfaces
- [x] All TypeScript compilation errors fixed
- [x] Development servers running successfully

## 🔄 Next Steps

### Phase 2: Organizer Upgrade Flow

#### 1. Create Organizer Upgrade Schema & API

- [x] Add `OrganizerUpgradeSchema` endpoint in backend
- [x] Create API route for upgrading user to organizer
- [x] Add organization details to user profile when upgrading

#### 2. Event Creation Flow Enhancement

- [x] Modify event creation page to detect participant role
- [x] Show organizer upgrade modal/form before allowing event creation
- [x] Collect organization name, phone number, and other organizer details
- [x] Automatically upgrade user to organizer after collecting details

#### 3. UI Components

- [x] Create `OrganizerUpgradeModal` component
- [x] Update event creation page to use upgrade flow
- [x] Add organizer details form
- [ ] Update user profile to show organizer information

#### 4. Database Updates

- [x] Ensure database can handle nullable organization_name and phone_number
- [x] Update user profile queries to include organizer fields
- [x] Add validation for organizer-specific actions

## Implementation Details

### OrganizerUpgradeSchema (Already Created)

```typescript
const OrganizerUpgradeSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  phoneNumber: z.string().optional(),
  description: z.string().optional(),
});
```

### Event Creation Flow

1. User clicks "Create Event"
2. Check if user role is "participant"
3. If participant, show organizer upgrade modal
4. Collect organizer details
5. Upgrade user to organizer role
6. Continue with event creation

### Benefits of This Approach

- Simplified onboarding (everyone starts as participant)
- Reduced friction in registration process
- Just-in-time collection of organizer details
- Better user experience progression

## Files Modified

### Frontend

- `frontend/src/pages/RegisterPage.tsx` - Simplified registration form
- `frontend/src/api/auth.ts` - Updated RegisterData interface
- `frontend/src/pages/CreateEventPage.tsx` - Added organizer upgrade flow
- `frontend/src/components/modals/OrganizerUpgradeModal.tsx` - New organizer upgrade modal
- `frontend/src/api/user.ts` - New user service for organizer upgrade
- `frontend/src/hooks/useAuth.ts` - Added updateUser to return object

### Backend

- `backend/src/controllers/authController.ts` - Simplified user creation
- `backend/src/controllers/userController.ts` - New user controller with organizer upgrade
- `backend/src/routes/users.ts` - New user routes
- `backend/src/server.ts` - Added user routes to app

### Shared

- `shared/src/schemas.ts` - Updated CreateUserSchema and added OrganizerUpgradeSchema

## Testing Checklist

- [x] Registration works with new simplified form
- [x] Users are created with "participant" role by default
- [x] Event creation flow prompts for organizer upgrade
- [x] Organizer upgrade updates user role and details
- [x] Existing organizers can still create events normally
- [x] Create Event buttons visible to all authenticated users
- [x] Navigation includes Create Event button
- [x] Dashboard has prominent Create Event button
- [x] Mobile menu includes Create Event button
- [x] Organizer upgrade modal works correctly
