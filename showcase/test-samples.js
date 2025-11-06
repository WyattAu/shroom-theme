// JavaScript sample code
function greet(name) {
    const message = `Hello, ${name}!`;
    console.log(message);
    return message;
}

class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    sayHello() {
        return `Hi, I'm ${this.name}`;
    }
}

const person = new Person("Alice", 30);
greet(person.name);

// Keywords: function, const, class, constructor, this, return, new
// Strings: "Hello, ${name}!", "Hi, I'm ${this.name}", "Alice"
// Comments: none in this sample
// Functions: greet, sayHello
// Variables: message, person, name, age
// Numbers: 30
// Operators: =, ., ${}, !
// Classes: Person
// Constants: none explicit