export declare enum UserRole {
    ADMIN = "ADMIN",
    DIRECTOR = "DIRECTOR",
    COORDINATOR = "COORDINATOR",
    THERAPIST = "THERAPIST"
}
export declare class CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}
