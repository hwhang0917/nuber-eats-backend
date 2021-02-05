<p align="center">
  <img src="https://d3i4yxtzktqr9n.cloudfront.net/web-eats-v2/0c6de4f0b3884eb89b28a29ecbc10d59.svg" width="120" alt="Uber Eats Logo" />
</p>

# Nuber Eats Clone - Backend

[![](https://img.shields.io/badge/author-RunFridge-brightgreen)](https://github.com/hwhang0917)

> This project is an Uber Eats clone practice project for backend, following lecture from [Nomad Coders](https://nomadcoders.co/)

## Models
____

#### Core Entity:

- [x] id
- [x] createdAt
- [x] updatedAt

#### User Entity:

- [x] email
- [x] password
- [x] role (client|owner|delivery|admin)
- [x] verified
- [x] restaurants (FK:Restaurant)

#### Verification Entity:

- [x] code
- [x] user (FK:User)

#### Restaurant Entity:

- [x] name
- [x] coverImage
- [x] address
- [x] category (FK:Category)
- [x] owner (FK:User)

#### Category Entity:

- [x] name
- [x] icon
- [x] slug
- [x] restaurants (FK:Restaurant)
