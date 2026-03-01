"""
CLI Management Tool for Robocop Attendance System.

Usage (local):
    python -m src.cli reset-password admin newpass123
    python -m src.cli create-admin admin robocop --full-name "Admin User"
    python -m src.cli list-users --role admin
    python -m src.cli set-role someuser teacher

Usage (Docker):
    docker exec -it robocop_backend python -m src.cli reset-password admin newpass123
    docker exec -it robocop_backend python -m src.cli create-admin admin robocop
    docker exec -it robocop_backend python -m src.cli list-users
    docker exec -it robocop_backend python -m src.cli set-role someuser admin
"""

import argparse
import sys

from sqlmodel import Session, select

from .database import engine, create_db_and_tables
from .models import User, UserRole
from .auth_service import get_password_hash


def reset_password(args):
    """Reset a user's password."""
    create_db_and_tables()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == args.username)).first()
        if not user:
            print(f"✗ User '{args.username}' not found.")
            sys.exit(1)

        user.password_hash = get_password_hash(args.password)
        session.add(user)
        session.commit()
        print(f"✓ Password reset for '{args.username}' (role: {user.role})")


def create_admin(args):
    """Create a new admin user."""
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == args.username)).first()
        if existing:
            print(f"✗ User '{args.username}' already exists (role: {existing.role}).")
            print(f"  Use 'set-role {args.username} admin' to promote, or 'reset-password' to change password.")
            sys.exit(1)

        user = User(
            username=args.username,
            password_hash=get_password_hash(args.password),
            role=UserRole.ADMIN,
            full_name=args.full_name or "Administrator",
        )
        session.add(user)
        session.commit()
        print(f"✓ Admin '{args.username}' created successfully.")


def list_users(args):
    """List all users, optionally filtered by role."""
    create_db_and_tables()
    with Session(engine) as session:
        query = select(User)
        if args.role:
            try:
                role_filter = UserRole(args.role)
                query = query.where(User.role == role_filter)
            except ValueError:
                print(f"✗ Invalid role '{args.role}'. Valid: {[r.value for r in UserRole]}")
                sys.exit(1)

        users = session.exec(query).all()

        if not users:
            print("No users found.")
            return

        # Header
        print(f"{'ID':<6} {'Username':<20} {'Role':<10} {'Full Name':<25} {'SAP ID':<15}")
        print("─" * 76)
        for u in users:
            print(f"{u.id:<6} {u.username:<20} {u.role:<10} {(u.full_name or '—'):<25} {(u.sap_id or '—'):<15}")
        print(f"\nTotal: {len(users)} user(s)")


def set_role(args):
    """Change a user's role."""
    create_db_and_tables()

    try:
        new_role = UserRole(args.role)
    except ValueError:
        print(f"✗ Invalid role '{args.role}'. Valid: {[r.value for r in UserRole]}")
        sys.exit(1)

    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == args.username)).first()
        if not user:
            print(f"✗ User '{args.username}' not found.")
            sys.exit(1)

        old_role = user.role
        user.role = new_role
        session.add(user)
        session.commit()
        print(f"✓ '{args.username}' role changed: {old_role} → {new_role}")


def main():
    parser = argparse.ArgumentParser(
        prog="robocop-cli",
        description="Robocop Attendance System — Account Management CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # reset-password
    rp = subparsers.add_parser("reset-password", help="Reset a user's password")
    rp.add_argument("username", help="Username of the account")
    rp.add_argument("password", help="New password")
    rp.set_defaults(func=reset_password)

    # create-admin
    ca = subparsers.add_parser("create-admin", help="Create a new admin account")
    ca.add_argument("username", help="Username for the admin")
    ca.add_argument("password", help="Password for the admin")
    ca.add_argument("--full-name", help="Full name (default: Administrator)")
    ca.set_defaults(func=create_admin)

    # list-users
    lu = subparsers.add_parser("list-users", help="List all users")
    lu.add_argument("--role", help="Filter by role (admin, teacher, student, kiosk)")
    lu.set_defaults(func=list_users)

    # set-role
    sr = subparsers.add_parser("set-role", help="Change a user's role")
    sr.add_argument("username", help="Username of the account")
    sr.add_argument("role", help="New role (admin, teacher, student, kiosk)")
    sr.set_defaults(func=set_role)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
