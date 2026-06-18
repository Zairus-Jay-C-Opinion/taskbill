-- Allow any authenticated user to read profiles (usernames are not sensitive).
-- Users can still only update/delete their own profile.
create policy "authenticated users can read any profile"
on profiles for select
using (auth.role() = 'authenticated');
