const OWNER_EMAILS = ['therealsmatiboi@gmail.com', 'threalsmatiboi@gmail.com'];

function forceOwnerRole(user) {
  if (user && OWNER_EMAILS.includes(String(user.email).toLowerCase())) {
    return { ...user, role: 'owner', status: 'active' };
  }
  return user;
}

module.exports = { OWNER_EMAILS, forceOwnerRole };
