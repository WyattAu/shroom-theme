// Rust sample code
fn greet(name: &str) -> String {
    let message = format!("Hello, {}!", name);
    println!("{}", message);
    message
}

struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Person {
        Person { name, age }
    }

    fn say_hello(&self) -> String {
        format!("Hi, I'm {}", self.name)
    }
}

let person = Person::new("Alice".to_string(), 30);
greet(&person.name);

// Keywords: fn, let, struct, impl, return, println
// Strings: "Hello, {}!", "Hi, I'm {}", "Alice"
// Comments: // Rust sample code, // Keywords: ...
// Functions: greet, say_hello, new
// Variables: message, person, name, age
// Numbers: 30
// Operators: =, ., &, ::, {}, !
// Classes: Person (struct)
// Constants: none